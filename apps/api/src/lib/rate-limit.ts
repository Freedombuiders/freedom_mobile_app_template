// D1-backed fixed-window rate limit for sign-in attempts (no extra Cloudflare product needed).
import { fail, nowIso } from "./http";

export async function checkRateLimit(db: D1Database, key: string) {
  const row = await db.prepare("SELECT locked_until FROM rate_limits WHERE key = ?").bind(key).first<{ locked_until: string | null }>();
  if (row?.locked_until && row.locked_until > nowIso()) {
    const mins = Math.max(1, Math.ceil((Date.parse(row.locked_until) - Date.now()) / 60_000));
    fail(429, `Bạn thử quá nhiều lần. Vui lòng đợi khoảng ${mins} phút rồi thử lại.`);
  }
}

export async function recordFailure(db: D1Database, key: string, max = 10, windowMin = 15) {
  const now = Date.now();
  const row = await db
    .prepare("SELECT count, window_start FROM rate_limits WHERE key = ?")
    .bind(key)
    .first<{ count: number; window_start: string }>();
  const inWindow = row && now - Date.parse(row.window_start) < windowMin * 60_000;
  const count = inWindow ? row.count + 1 : 1;
  const start = inWindow ? row.window_start : new Date(now).toISOString();
  const locked = count >= max ? new Date(now + windowMin * 60_000).toISOString() : null;
  await db
    .prepare(
      `INSERT INTO rate_limits (key, count, window_start, locked_until) VALUES (?,?,?,?)
       ON CONFLICT(key) DO UPDATE SET count = excluded.count, window_start = excluded.window_start, locked_until = excluded.locked_until`,
    )
    .bind(key, count, start, locked)
    .run();
}

export async function clearRateLimit(db: D1Database, key: string) {
  await db.prepare("DELETE FROM rate_limits WHERE key = ?").bind(key).run();
}
