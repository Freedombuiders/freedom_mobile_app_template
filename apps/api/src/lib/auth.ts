// Sessions for two kinds of clients:
// - Browsers (apps/web, same origin): HttpOnly cookie, SameSite=Lax + Origin check on writes (CSRF).
// - The native app (apps/mobile): sends `X-App-Client: mobile`, receives a token in the sign-in response and sends it
//   back as `Authorization: Bearer <token>`. Browsers always send Origin on POST, so they never take this branch.
// Only the SHA-256 of a token is stored, so a database leak does not leak sessions.
import type { Context, MiddlewareHandler } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { APP_CLIENT_HEADER, APP_CLIENT_VALUE, APP_PLATFORM_HEADER, type User } from "@app/shared/api";
import type { Env } from "./env";
import { fail, nowIso } from "./http";

export type AppEnv = { Bindings: Env; Variables: { user: User } };
export type Ctx = Context<AppEnv>;

const COOKIE = "session";
const SESSION_DAYS = 30;
const PBKDF2_ITERATIONS = 100_000; // the maximum Workers' WebCrypto allows

// ---------- Password hashing (PBKDF2-SHA256, constant-time compare) ----------
const b64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (ch) => ch.charCodeAt(0));

async function pbkdf2(secret: string, salt: Uint8Array, iterations: number): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), "PBKDF2", false, ["deriveBits"]);
  return crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${b64(salt)}$${b64(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iter, salt, hash] = stored.split("$");
  if (scheme !== "pbkdf2" || !iter || !salt || !hash) return false;
  const actual = new Uint8Array(await pbkdf2(password, unb64(salt), Number(iter)));
  const expected = unb64(hash);
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i]! ^ expected[i]!;
  return diff === 0;
}

export async function sha256(s: string): Promise<string> {
  return b64(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
}

const b64url = (buf: Uint8Array) => b64(buf).replace(/[+/=]/g, (m) => ({ "+": "-", "/": "_", "=": "" })[m]!);
export const randomToken = (bytes = 32) => b64url(crypto.getRandomValues(new Uint8Array(bytes)));

// ---------- Clients ----------
export const isAppClient = (c: Ctx) => c.req.header(APP_CLIENT_HEADER) === APP_CLIENT_VALUE && !c.req.header("origin");
const clientName = (c: Ctx) => (isAppClient(c) ? (c.req.header(APP_PLATFORM_HEADER) === "android" ? "android" : "ios") : "web");
export const clientIp = (c: Ctx) => c.req.header("cf-connecting-ip") || "local";

function sessionToken(c: Ctx) {
  const auth = c.req.header("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7).trim() || undefined;
  return getCookie(c, COOKIE);
}

// ---------- Sessions ----------
/** Starts a session. Browsers get the cookie; the returned token is for the app (put it in the response body). */
export async function createSession(c: Ctx, userId: string): Promise<string> {
  const token = randomToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await c.env.DB.prepare("INSERT INTO sessions (id, user_id, client, expires_at, created_at) VALUES (?,?,?,?,?)")
    .bind(await sha256(token), userId, clientName(c), expires.toISOString(), nowIso())
    .run();
  if (!isAppClient(c)) {
    setCookie(c, COOKIE, token, {
      httpOnly: true,
      secure: new URL(c.req.url).protocol === "https:",
      sameSite: "Lax",
      path: "/",
      expires,
    });
  }
  return token;
}

export async function destroySession(c: Ctx) {
  const token = sessionToken(c);
  if (token) await c.env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(await sha256(token)).run();
  if (getCookie(c, COOKIE)) deleteCookie(c, COOKIE, { path: "/" });
}

export function toUser(row: Record<string, unknown>): User {
  return {
    id: String(row.id),
    email: String(row.email),
    name: String(row.name),
    createdAt: String(row.created_at),
  };
}

export async function loadUser(c: Ctx): Promise<User | null> {
  const token = sessionToken(c);
  if (!token) return null;
  const row = await c.env.DB.prepare(
    "SELECT u.*, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?",
  )
    .bind(await sha256(token))
    .first<Record<string, unknown>>();
  if (!row || String(row.expires_at) < nowIso()) return null;
  return toUser(row);
}

/** Every route mounted after this middleware needs a signed-in user: `c.get("user")`. */
export const requireUser: MiddlewareHandler<AppEnv> = async (c, next) => {
  const user = await loadUser(c);
  if (!user) fail(401, "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
  c.set("user", user);
  await next();
};

/** CSRF defence for cookie sessions: state-changing requests must come from this origin and be JSON. */
export const sameOrigin: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method)) {
    const origin = c.req.header("origin");
    const site = c.req.header("sec-fetch-site");
    const self = new URL(c.req.url).origin;
    const ok = origin ? origin === self : site === "same-origin" || site === undefined;
    if (!ok) fail(403, "Yêu cầu không hợp lệ (khác nguồn).");
    const ct = c.req.header("content-type") || "";
    if (c.req.method !== "DELETE" && !ct.includes("application/json")) fail(400, "Yêu cầu phải là JSON.");
  }
  await next();
};
