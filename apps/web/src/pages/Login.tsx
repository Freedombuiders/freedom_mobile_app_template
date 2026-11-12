import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { firstError, loginSchema } from "@app/shared/schemas";
import { Button, Card, ErrorText, Field, Input } from "../components/ui";
import { useSession } from "../lib/session";

/** Only same-site paths after sign-in (never an absolute URL from the query string). */
const safeNext = (next: string | null) => (next && next.startsWith("/") && !next.startsWith("//") ? next : "/app");

export default function Login() {
  const { user, login } = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={safeNext(params.get("next"))} replace />;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = loginSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) return setError(firstError(parsed.error));
    setBusy(true);
    setError("");
    try {
      await login(parsed.data);
      navigate(safeNext(params.get("next")), { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card>
        <h1 className="text-2xl font-bold">Đăng nhập</h1>
        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          <Field label="Email">
            <Input name="email" type="email" autoComplete="email" required />
          </Field>
          <Field label="Mật khẩu">
            <Input name="password" type="password" autoComplete="current-password" required />
          </Field>
          <ErrorText>{error}</ErrorText>
          <Button type="submit" busy={busy} className="w-full">
            Đăng nhập
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          Chưa có tài khoản?{" "}
          <Link to="/signup" className="font-semibold text-brand">
            Đăng ký
          </Link>
        </p>
      </Card>
    </div>
  );
}
