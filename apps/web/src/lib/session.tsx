import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@app/shared/api";
import type { LoginInput, SignupInput } from "@app/shared/schemas";
import { api, type ApiError } from "./api";

type Session = {
  user: User | null;
  loading: boolean; // true until /api/me has answered once
  login: (input: LoginInput) => Promise<User>;
  signup: (input: SignupInput) => Promise<User>;
  logout: () => Promise<void>;
  setUser: (u: User | null) => void;
};

const Ctx = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ user: User | null }>("/api/auth/session")
      .then((s) => setUser(s.user))
      .catch((e: ApiError) => console.warn("Session check failed:", e.message))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const u = await api.post<User>("/api/auth/login", input);
    setUser(u);
    return u;
  }, []);

  const signup = useCallback(async (input: SignupInput) => {
    const u = await api.post<User>("/api/auth/signup", input);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    await api.post("/api/auth/logout").catch(() => {});
    setUser(null);
  }, []);

  return <Ctx.Provider value={{ user, loading, login, signup, logout, setUser }}>{children}</Ctx.Provider>;
}

export function useSession() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSession must be used inside <SessionProvider>");
  return v;
}

/** The signed-in user; only inside routes wrapped by <RequireAuth>. */
export function useUser(): User {
  const { user } = useSession();
  if (!user) throw new Error("useUser without a session");
  return user;
}
