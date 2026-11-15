import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  googleLogin as googleLoginRequest,
  login as loginRequest,
  logout as logoutRequest,
  readStoredSession,
  refresh as refreshRequest,
  register as registerRequest,
  storeSession,
  SESSION_KEY,
  type AuthSession,
  type LoginPayload,
  type RegisterPayload,
} from "./auth-api";
import { setActiveAccount } from "./user-store";
import { createSessionRefresh, sameSession } from "./session-refresh";

interface AuthContextValue {
  session: AuthSession | null;
  isRestoring: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Dữ liệu cá nhân được namespace theo accountId. Phải set NGAY khi app khởi
  // động, nếu không màn hình sẽ đọc dữ liệu của tài khoản trước trong RAM.
  const [session, setSession] = useState<AuthSession | null>(() => {
    const stored = readStoredSession();
    setActiveAccount(stored?.account.accountId ?? null);
    return stored;
  });
  const [isRestoring, setIsRestoring] = useState(true);
  const sessionRef = useRef(session);
  const [retryAt, setRetryAt] = useState(0);
  const [refreshSession] = useState(() => createSessionRefresh({
    read: readStoredSession,
    write: storeSession,
    request: refreshRequest,
    withLock: async action => navigator.locks
      ? await navigator.locks.request("bonbon.auth.refresh", action)
      : action(),
  }));

  const applySession = useCallback((nextSession: AuthSession | null) => {
    sessionRef.current = nextSession;
    setSession(nextSession);
    setActiveAccount(nextSession?.account.accountId ?? null);
  }, []);

  const commitSession = useCallback((nextSession: AuthSession | null) => {
    storeSession(nextSession);
    applySession(nextSession);
    setRetryAt(0);
  }, [applySession]);

  useEffect(() => {
    const syncSession = (event: StorageEvent) => {
      if (event.key === SESSION_KEY || event.key === null) {
        applySession(readStoredSession());
        setRetryAt(0);
      }
    };
    window.addEventListener("storage", syncSession);
    return () => window.removeEventListener("storage", syncSession);
  }, [applySession]);

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
        await refreshSession(session);
      } catch {
        if (!cancelled && sameSession(readStoredSession(), session)) setRetryAt(Date.now() + 30_000);
      } finally {
        if (!cancelled) {
          applySession(readStoredSession());
          setIsRestoring(false);
        }
      }
    }

    void restore();
    return () => { cancelled = true; };
  }, []); // Restore the persisted session once when the application starts.

  useEffect(() => {
    if (!session || isRestoring) return;

    const refreshIn = Math.max(session.accessTokenExpiresAt * 1000 - Date.now() - 60_000, retryAt - Date.now(), 1_000);
    const timeout = window.setTimeout(async () => {
      try {
        await refreshSession(session);
      } catch {
        if (sameSession(readStoredSession(), session)) setRetryAt(Date.now() + 30_000);
      } finally {
        applySession(readStoredSession());
      }
    }, refreshIn);

    return () => window.clearTimeout(timeout);
  }, [applySession, refreshSession, session, isRestoring, retryAt]);

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
    async refreshPermissions() {
      const current = readStoredSession();
      if (!current) return;
      try { await refreshSession(current); }
      finally { applySession(readStoredSession()); }
    },
    async logout() {
      const currentSession = readStoredSession() ?? sessionRef.current;
      commitSession(null);
      if (!currentSession) return;

      try {
        await logoutRequest(currentSession);
      } catch {
        // The local session must still be cleared if the API is unavailable.
      }
    },
  }), [applySession, commitSession, isRestoring, refreshSession, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
