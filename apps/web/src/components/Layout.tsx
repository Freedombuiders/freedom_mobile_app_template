import { Link, Navigate, NavLink, Outlet, useLocation } from "react-router";
import { APP_INFO, LEGAL_PATHS } from "@app/shared/app-info";
import { useSession } from "../lib/session";

export function SiteLayout() {
  const { user, logout } = useSession();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 font-bold">
            <img src="/favicon.png" alt="" className="h-7 w-7 rounded-lg" />
            {APP_INFO.name}
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium">
            {user ? (
              <>
                <NavLink to="/app" end className={({ isActive }) => (isActive ? "text-brand" : "text-muted hover:text-ink")}>
                  Ghi chú
                </NavLink>
                <NavLink to="/app/account" className={({ isActive }) => (isActive ? "text-brand" : "text-muted hover:text-ink")}>
                  Tài khoản
                </NavLink>
                <button onClick={() => void logout()} className="text-muted hover:text-ink">
                  Đăng xuất
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-muted hover:text-ink">
                  Đăng nhập
                </Link>
                <Link to="/signup" className="rounded-xl bg-brand px-3.5 py-2 text-white hover:bg-brand-dark">
                  Đăng ký
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-line bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted">
          <span>
            © {new Date().getFullYear()} {APP_INFO.operator}
          </span>
          <div className="flex flex-wrap gap-4">
            <Link to={LEGAL_PATHS.privacy}>Bảo mật</Link>
            <Link to={LEGAL_PATHS.terms}>Điều khoản</Link>
            <Link to={LEGAL_PATHS.support}>Hỗ trợ</Link>
            <Link to={LEGAL_PATHS.deleteAccount}>Xoá tài khoản</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

/** Wraps the signed-in area: waits for the session check, then sends visitors to /login (and back afterwards). */
export function RequireAuth() {
  const { user, loading } = useSession();
  const location = useLocation();
  if (loading) return <p className="p-8 text-center text-muted">Đang tải…</p>;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  return <Outlet />;
}
