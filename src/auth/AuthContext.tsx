import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  googleLogin as googleLoginRequest,
  login as loginRequest,
  logout as logoutRequest,
  readStoredSession,
  refresh as refreshRequest,
  register as registerRequest,
  storeSession,
  type AuthSession,
  type LoginPayload,
  type RegisterPayload,
} from "./auth-api";

interface AuthContextValue {
  session: AuthSession | null;
  isRestoring: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => readStoredSession());
  const [isRestoring, setIsRestoring] = useState(true);

  const commitSession = useCallback((nextSession: AuthSession | null) => {
    storeSession(nextSession);
    setSession(nextSession);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      if (!session) {
        setIsRestoring(false);
        return;
      }

      const expiresSoon = session.accessTokenExpiresAt * 1000 <= Date.now() + 30_000;
      if (!expiresSoon) {
        setIsRestoring(false);
        return;
      }

      try {
        const nextSession = await refreshRequest(session.refreshToken);
        if (!cancelled) commitSession(nextSession);
      } catch {
        if (!cancelled) commitSession(null);
      } finally {
        if (!cancelled) setIsRestoring(false);
      }
    }

    void restore();
    return () => { cancelled = true; };
  }, []); // Restore the persisted session once when the application starts.

  useEffect(() => {
    if (!session) return;

    const refreshIn = Math.max(session.accessTokenExpiresAt * 1000 - Date.now() - 60_000, 1_000);
    const timeout = window.setTimeout(async () => {
      try {
        commitSession(await refreshRequest(session.refreshToken));
      } catch {
        commitSession(null);
      }
    }, refreshIn);

    return () => window.clearTimeout(timeout);
  }, [commitSession, session]);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    isRestoring,
    async login(payload) {
      commitSession(await loginRequest(payload));
    },
    async register(payload) {
      commitSession(await registerRequest(payload));
    },
    async loginWithGoogle(idToken) {
      commitSession(await googleLoginRequest(idToken));
    },
    async logout() {
      const currentSession = session;
      commitSession(null);
      if (!currentSession) return;

      try {
        await logoutRequest(currentSession);
      } catch {
        // The local session must still be cleared if the API is unavailable.
      }
    },
  }), [commitSession, isRestoring, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
