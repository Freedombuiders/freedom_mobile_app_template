// Example signed-in page: list / add / toggle / delete notes through /api/notes.
// Copy this pattern for your own resources, then delete it with apps/api/src/routes/notes.ts.
import { useEffect, useState, type FormEvent } from "react";
import type { Note } from "@app/shared/api";
import { firstError, noteInputSchema } from "@app/shared/schemas";
import { Button, Card, ErrorText, Input, Textarea } from "../components/ui";
import { api } from "../lib/api";
import { useUser } from "../lib/session";

export default function Notes() {
  const user = useUser();
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get<Note[]>("/api/notes").then(setNotes, (e: Error) => setError(e.message));
  }, []);

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const parsed = noteInputSchema.safeParse(Object.fromEntries(new FormData(form)));
    if (!parsed.success) return setError(firstError(parsed.error));
    setBusy(true);
    setError("");
    try {
      const note = await api.post<Note>("/api/notes", parsed.data);
      setNotes((list) => [note, ...(list ?? [])]);
      form.reset();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(note: Note) {
    const updated = await api.patch<Note>(`/api/notes/${note.id}`, { done: !note.done });
    setNotes((list) => list?.map((n) => (n.id === note.id ? updated : n)) ?? null);
  }

  async function remove(note: Note) {
    if (!confirm(`Xoá "${note.title}"?`)) return;
    await api.del(`/api/notes/${note.id}`);
    setNotes((list) => list?.filter((n) => n.id !== note.id) ?? null);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      <h1 className="text-2xl font-bold">Chào {user.name} 👋</h1>
      <Card>
        <form onSubmit={add} className="space-y-3" noValidate>
          <Input name="title" placeholder="Tiêu đề ghi chú" />
          <Textarea name="body" placeholder="Nội dung (không bắt buộc)" />
          <ErrorText>{error}</ErrorText>
          <Button type="submit" busy={busy}>
            Thêm ghi chú
          </Button>
        </form>
      </Card>
      {notes === null ? (
        <p className="text-muted">Đang tải…</p>
      ) : notes.length === 0 ? (
        <p className="text-muted">Chưa có ghi chú nào.</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => (
            <li key={n.id} className="flex items-start gap-3 rounded-2xl border border-line bg-white p-4">
              <input type="checkbox" checked={n.done} onChange={() => void toggle(n)} className="mt-1 h-4 w-4 accent-brand" />
              <div className="min-w-0 flex-1">
                <p className={n.done ? "font-medium text-muted line-through" : "font-medium"}>{n.title}</p>
                {n.body && <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{n.body}</p>}
              </div>
              <button onClick={() => void remove(n)} className="text-sm text-muted hover:text-danger">
                Xoá
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
