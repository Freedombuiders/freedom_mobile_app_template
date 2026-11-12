// Example CRUD resource. Copy this file as the starting point for your own resources:
// 1. migration in apps/api/migrations  2. types in packages/shared/src/api.ts  3. zod schemas in schemas.ts
// 4. a router like this one, mounted in src/index.ts  5. screens in apps/web and apps/mobile.
import { Hono } from "hono";
import type { Note } from "@app/shared/api";
import { noteInputSchema, notePatchSchema } from "@app/shared/schemas";
import type { AppEnv } from "../lib/auth";
import { fail, newId, nowIso, readBody } from "../lib/http";

export const noteRoutes = new Hono<AppEnv>();

const toNote = (r: Record<string, unknown>): Note => ({
  id: String(r.id),
  title: String(r.title),
  body: String(r.body),
  done: !!r.done,
  createdAt: String(r.created_at),
  updatedAt: String(r.updated_at),
});

// Every query is scoped by user_id: a user can never read or change someone else's rows.
noteRoutes.get("/", async (c) => {
  const { results } = await c.env.DB.prepare("SELECT * FROM notes WHERE user_id = ? ORDER BY created_at DESC LIMIT 200")
    .bind(c.get("user").id)
    .all<Record<string, unknown>>();
  return c.json<Note[]>(results.map(toNote));
});

noteRoutes.post("/", async (c) => {
  const input = await readBody(c, noteInputSchema);
  const now = nowIso();
  const note: Note = { id: newId(), title: input.title, body: input.body, done: false, createdAt: now, updatedAt: now };
  await c.env.DB.prepare("INSERT INTO notes (id, user_id, title, body, done, created_at, updated_at) VALUES (?,?,?,?,0,?,?)")
    .bind(note.id, c.get("user").id, note.title, note.body, now, now)
    .run();
  return c.json<Note>(note, 201);
});

noteRoutes.patch("/:id", async (c) => {
  const input = await readBody(c, notePatchSchema);
  const userId = c.get("user").id;
  const row = await c.env.DB.prepare("SELECT * FROM notes WHERE id = ? AND user_id = ?").bind(c.req.param("id"), userId).first<Record<string, unknown>>();
  if (!row) fail(404, "Không tìm thấy ghi chú.");
  const note = { ...toNote(row), ...input, updatedAt: nowIso() };
  await c.env.DB.prepare("UPDATE notes SET title = ?, body = ?, done = ?, updated_at = ? WHERE id = ? AND user_id = ?")
    .bind(note.title, note.body, note.done ? 1 : 0, note.updatedAt, note.id, userId)
    .run();
  return c.json<Note>(note);
});

noteRoutes.delete("/:id", async (c) => {
  const res = await c.env.DB.prepare("DELETE FROM notes WHERE id = ? AND user_id = ?").bind(c.req.param("id"), c.get("user").id).run();
  if (!res.meta.changes) fail(404, "Không tìm thấy ghi chú.");
  return c.json({ ok: true });
});
