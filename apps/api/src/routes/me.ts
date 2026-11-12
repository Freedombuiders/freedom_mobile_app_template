import { Hono } from "hono";
import type { User } from "@app/shared/api";
import { deleteAccountSchema, updateProfileSchema } from "@app/shared/schemas";
import { destroySession, verifyPassword, type AppEnv } from "../lib/auth";
import { fail, nowIso, readBody } from "../lib/http";

// The signed-in user's own account. In-app account deletion is required by both App Store and Google Play.
export const meRoutes = new Hono<AppEnv>();

meRoutes.get("/", (c) => c.json<User>(c.get("user")));

meRoutes.patch("/", async (c) => {
  const input = await readBody(c, updateProfileSchema);
  const user = c.get("user");
  await c.env.DB.prepare("UPDATE users SET name = ?, updated_at = ? WHERE id = ?").bind(input.name, nowIso(), user.id).run();
  return c.json<User>({ ...user, name: input.name });
});

meRoutes.delete("/", async (c) => {
  const input = await readBody(c, deleteAccountSchema);
  const user = c.get("user");
  const row = await c.env.DB.prepare("SELECT password_hash FROM users WHERE id = ?").bind(user.id).first<{ password_hash: string | null }>();
  if (row?.password_hash && !(input.password && (await verifyPassword(input.password, row.password_hash)))) {
    fail(403, "Mật khẩu không đúng.");
  }
  await destroySession(c);
  // Sessions and every row with `REFERENCES users(id) ON DELETE CASCADE` go with the user (D1 enforces foreign keys).
  await c.env.DB.prepare("DELETE FROM users WHERE id = ?").bind(user.id).run();
  return c.json({ ok: true });
});
