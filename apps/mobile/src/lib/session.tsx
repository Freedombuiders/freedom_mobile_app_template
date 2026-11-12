import type { AppSession, User } from "@app/shared/api";
import * as SecureStore from "expo-secure-store";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, getApiToken, onUnauthorized, setApiToken } from "./api";

const TOKEN_KEY = "session_token";

type Session = {
  user: User | null;
  loading: boolean; // true until the stored token has been checked
  /** POST a sign-in endpoint (/api/auth/login, /api/auth/signup) and keep the session it returns. */
  signIn: (path: string, body: unknown) => Promise<User>;
  signOut: () => Promise<void>;
  /** Forget the session on this device only (after the account was deleted). */
  forget: () => Promise<void>;
  setUser: (u: User) => void;
};

const Ctx = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const forget = useCallback(async () => {
    setApiToken(null);
    setUserState(null);
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
  }, []);

  useEffect(() => {
    (async () => {
      const stored = await SecureStore.getItemAsync(TOKEN_KEY).catch(() => null);
      if (stored) {
        setApiToken(stored);
        try {
          setUserState(await api.get<User>("/api/me"));
        } catch {
          // 401 → onUnauthorized below forgets the token; offline → stay signed out until the next launch.
        }
      }
      setLoading(false);
    })();
    return onUnauthorized((t) => {
      if (t && t === getApiToken()) void forget();
    });
  }, [forget]);

  const signIn = useCallback(async (path: string, body: unknown) => {
    const s = await api.post<AppSession>(path, body);
    setApiToken(s.token);
    setUserState(s.user);
    await SecureStore.setItemAsync(TOKEN_KEY, s.token);
    return s.user;
  }, []);

  // Local first, so the device is signed out even when offline; the server-side revoke runs in the background.
  const signOut = useCallback(async () => {
    const old = getApiToken();
    await forget();
    if (old) void api.request("POST", "/api/auth/logout", {}, { Authorization: `Bearer ${old}` }).catch(() => {});
  }, [forget]);

  return (
    <Ctx.Provider value={{ user, loading, signIn, signOut, forget, setUser: setUserState }}>{children}</Ctx.Provider>
  );
}

export function useSession() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSession must be used inside <SessionProvider>");
  return v;
}

/** The signed-in user; only inside the (app) group, which is guarded in app/_layout.tsx. */
export function useUser(): User {
  const { user } = useSession();
  if (!user) throw new Error("useUser without a session");
  return user;
}
