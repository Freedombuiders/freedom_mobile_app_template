import { Hono } from "hono";
import type { AppSession, User } from "@app/shared/api";
import { loginSchema, signupSchema } from "@app/shared/schemas";
import { clientIp, createSession, destroySession, hashPassword, isAppClient, loadUser, toUser, verifyPassword, type AppEnv, type Ctx } from "../lib/auth";
import { fail, newId, nowIso, readBody } from "../lib/http";
import { checkRateLimit, clearRateLimit, recordFailure } from "../lib/rate-limit";

export const authRoutes = new Hono<AppEnv>();

/** The web gets `User` (and a cookie); the app gets `AppSession` with the bearer token. */
async function signedIn(c: Ctx, user: User) {
  const token = await createSession(c, user.id);
  return isAppClient(c) ? c.json<AppSession>({ token, user }) : c.json<User>(user);
}

authRoutes.post("/signup", async (c) => {
  const input = await readBody(c, signupSchema);
  const ipKey = `signup:${clientIp(c)}`;
  await checkRateLimit(c.env.DB, ipKey);
  await recordFailure(c.env.DB, ipKey, 20, 60); // at most 20 sign-ups per IP per hour
  const exists = await c.env.DB.prepare("SELECT 1 FROM users WHERE email = ?").bind(input.email).first();
  if (exists) fail(409, "Email này đã có tài khoản. Hãy đăng nhập.");
  const now = nowIso();
  const user: User = { id: newId(), email: input.email, name: input.name, createdAt: now };
  await c.env.DB.prepare("INSERT INTO users (id, email, name, password_hash, created_at, updated_at) VALUES (?,?,?,?,?,?)")
    .bind(user.id, user.email, user.name, await hashPassword(input.password), now, now)
    .run();
  return signedIn(c, user);
});

authRoutes.post("/login", async (c) => {
  const input = await readBody(c, loginSchema);
  const key = `login:${input.email}`;
  await checkRateLimit(c.env.DB, key);
  const row = await c.env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(input.email).first<Record<string, unknown>>();
  const ok = row?.password_hash ? await verifyPassword(input.password, String(row.password_hash)) : false;
  if (!row || !ok) {
    await recordFailure(c.env.DB, key);
    fail(401, "Email hoặc mật khẩu không đúng.");
  }
  await clearRateLimit(c.env.DB, key);
  return signedIn(c, toUser(row));
});

/** Who is signed in, without a 401 for visitors (the web calls this on every page load). */
authRoutes.get("/session", async (c) => c.json<{ user: User | null }>({ user: await loadUser(c) }));

authRoutes.post("/logout", async (c) => {
  await destroySession(c);
  return c.json({ ok: true });
});
