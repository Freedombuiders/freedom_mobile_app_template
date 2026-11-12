import { Link } from "react-router";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="text-5xl font-extrabold text-brand">404</p>
      <p className="mt-4 text-muted">Không tìm thấy trang này.</p>
      <Link to="/" className="mt-6 inline-block font-semibold text-brand">
        Về trang chủ
      </Link>
    </div>
  );
}
