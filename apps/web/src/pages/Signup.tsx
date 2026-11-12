import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { LEGAL_PATHS } from "@app/shared/app-info";
import { firstError, signupSchema } from "@app/shared/schemas";
import { Button, Card, ErrorText, Field, Input } from "../components/ui";
import { useSession } from "../lib/session";

export default function Signup() {
  const { user, signup } = useSession();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/app" replace />;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = signupSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) return setError(firstError(parsed.error));
    setBusy(true);
    setError("");
    try {
      await signup(parsed.data);
      navigate("/app", { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card>
        <h1 className="text-2xl font-bold">Tạo tài khoản</h1>
        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          <Field label="Tên của bạn">
            <Input name="name" autoComplete="name" required />
          </Field>
          <Field label="Email">
            <Input name="email" type="email" autoComplete="email" required />
          </Field>
          <Field label="Mật khẩu" hint="Ít nhất 8 ký tự.">
            <Input name="password" type="password" autoComplete="new-password" required />
          </Field>
          <ErrorText>{error}</ErrorText>
          <Button type="submit" busy={busy} className="w-full">
            Đăng ký
          </Button>
          <p className="text-center text-xs text-muted">
            Khi đăng ký, bạn đồng ý với{" "}
            <Link to={LEGAL_PATHS.terms} className="underline">
              Điều khoản
            </Link>{" "}
            và{" "}
            <Link to={LEGAL_PATHS.privacy} className="underline">
              Chính sách bảo mật
            </Link>
            .
          </p>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          Đã có tài khoản?{" "}
          <Link to="/login" className="font-semibold text-brand">
            Đăng nhập
          </Link>
        </p>
      </Card>
    </div>
  );
}
