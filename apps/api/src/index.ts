// Cloudflare Worker entry: the JSON API under /api (Hono). Everything else is the web build (wrangler.jsonc "assets").
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { Health } from "@app/shared/api";
import { requireUser, sameOrigin, type AppEnv } from "./lib/auth";
import type { Env } from "./lib/env";
import { nowIso } from "./lib/http";
import { authRoutes } from "./routes/auth";
import { meRoutes } from "./routes/me";
import { noteRoutes } from "./routes/notes";

const app = new Hono<AppEnv>().basePath("/api");

app.use(async (c, next) => {
  await next();
  if (!c.res.headers.has("Cache-Control")) c.header("Cache-Control", "no-store");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "same-origin");
});
app.use(sameOrigin);

// Public routes
app.get("/health", (c) => c.json<Health>({ ok: true, env: c.env.APP_ENV, time: nowIso() }));
app.route("/auth", authRoutes);

// Everything below needs a signed-in user.
app.use("*", requireUser);
app.route("/me", meRoutes);
app.route("/notes", noteRoutes);

app.notFound((c) => c.json({ error: "Không tìm thấy." }, 404));
app.onError((err, c) => {
  if (err instanceof HTTPException) return c.json({ error: err.message }, err.status);
  console.error("Unhandled error", err);
  return c.json({ error: "Máy chủ đang gặp sự cố, vui lòng thử lại sau." }, 500);
});

export default {
  fetch: app.fetch,
  // Cron in wrangler.jsonc "triggers": clean up rows nobody needs any more.
  async scheduled(_event, env) {
    const now = nowIso();
    const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
    await env.DB.batch([
      env.DB.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(now),
      env.DB.prepare("DELETE FROM rate_limits WHERE window_start < ? AND (locked_until IS NULL OR locked_until < ?)").bind(dayAgo, now),
    ]);
  },
} satisfies ExportedHandler<Env>;
