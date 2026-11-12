import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import type { User } from "@app/shared/api";
import { firstError, updateProfileSchema } from "@app/shared/schemas";
import { Button, Card, ErrorText, Field, Input } from "../components/ui";
import { api } from "../lib/api";
import { useSession, useUser } from "../lib/session";

export default function Account() {
  const user = useUser();
  const { setUser } = useSession();
  const navigate = useNavigate();
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [busy, setBusy] = useState<"save" | "delete" | null>(null);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = updateProfileSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) return setError(firstError(parsed.error));
    setBusy("save");
    setError("");
    try {
      setUser(await api.patch<User>("/api/me", parsed.data));
      setMsg("Đã lưu.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function remove(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password") || "");
    if (!confirm("Xoá vĩnh viễn tài khoản và toàn bộ dữ liệu? Không thể hoàn tác.")) return;
    setBusy("delete");
    setDeleteError("");
    try {
      await api.del("/api/me", { password });
      setUser(null);
      navigate("/", { replace: true });
    } catch (err) {
      setDeleteError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      <h1 className="text-2xl font-bold">Tài khoản</h1>
      <Card>
        <form onSubmit={save} className="space-y-4" noValidate>
          <Field label="Email">
            <Input value={user.email} disabled />
          </Field>
          <Field label="Tên">
            <Input name="name" defaultValue={user.name} onChange={() => setMsg("")} />
          </Field>
          <ErrorText>{error}</ErrorText>
          {msg && <p className="text-sm text-green-700">{msg}</p>}
          <Button type="submit" busy={busy === "save"}>
            Lưu
          </Button>
        </form>
      </Card>
      <Card className="border-red-200">
        <h2 className="font-semibold text-danger">Xoá tài khoản</h2>
        <p className="mt-1 text-sm text-muted">Toàn bộ dữ liệu của bạn sẽ bị xoá ngay và không thể khôi phục.</p>
        <form onSubmit={remove} className="mt-4 space-y-3">
          <Field label="Nhập mật khẩu để xác nhận">
            <Input name="password" type="password" autoComplete="current-password" />
          </Field>
          <ErrorText>{deleteError}</ErrorText>
          <Button type="submit" variant="danger" busy={busy === "delete"}>
            Xoá tài khoản vĩnh viễn
          </Button>
        </form>
      </Card>
    </div>
  );
}
