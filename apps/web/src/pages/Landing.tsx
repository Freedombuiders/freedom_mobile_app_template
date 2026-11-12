import { Link } from "react-router";
import { APP_INFO } from "@app/shared/app-info";
import { useSession } from "../lib/session";

// The public home page. Replace with the landing page from your design (docs/design/).
export default function Landing() {
  const { user } = useSession();
  return (
    <section className="mx-auto max-w-5xl px-4 py-20 text-center">
      <img src="/icon.png" alt="" className="mx-auto h-20 w-20 rounded-3xl shadow-lg" />
      <h1 className="mt-8 text-4xl font-extrabold tracking-tight sm:text-5xl">{APP_INFO.name}</h1>
      <p className="mx-auto mt-4 max-w-xl text-lg text-muted">{APP_INFO.tagline}</p>
      <div className="mt-8 flex justify-center gap-3">
        {user ? (
          <Link to="/app" className="rounded-xl bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-dark">
            Vào ứng dụng
          </Link>
        ) : (
          <>
            <Link to="/signup" className="rounded-xl bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-dark">
              Bắt đầu miễn phí
            </Link>
            <Link to="/login" className="rounded-xl border border-line bg-white px-5 py-3 font-semibold hover:bg-slate-50">
              Đăng nhập
            </Link>
          </>
        )}
      </div>
      <div className="mx-auto mt-16 grid max-w-3xl gap-4 text-left sm:grid-cols-3">
        {[
          ["📱", "iOS & Android", "Một mã nguồn Expo cho cả hai nền tảng."],
          ["🌐", "Web", "React + Vite, cùng API và tài khoản với app."],
          ["⚡", "Cloudflare", "API trên Workers, dữ liệu trên D1."],
        ].map(([icon, title, text]) => (
          <div key={title} className="rounded-2xl border border-line bg-white p-5">
            <div className="text-2xl">{icon}</div>
            <h2 className="mt-2 font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-muted">{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
