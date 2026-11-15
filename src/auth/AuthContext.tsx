import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
import { setActiveAccount } from "./user-store";

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
  // Dữ liệu cá nhân được namespace theo accountId. Phải set NGAY khi app khởi
  // động, nếu không màn hình sẽ đọc dữ liệu của tài khoản trước trong RAM.
  const [session, setSession] = useState<AuthSession | null>(() => {
    const stored = readStoredSession();
    setActiveAccount(stored?.account.accountId ?? null);
    return stored;
  });
  const [isRestoring, setIsRestoring] = useState(true);

  // Gộp các request refresh đang chạy: nhiều component/tab có thể refresh
  // cùng lúc. Backend chỉ chấp nhận một lần dùng mỗi refresh token, nên nếu gọi
  // song song thì các lần sau sẽ bị từ chối. Chỉ một request thực sự đi ra.
  const refreshInFlight = useRef<Promise<AuthSession> | null>(null);

  const commitSession = useCallback((nextSession: AuthSession | null) => {
    storeSession(nextSession);
    setSession(nextSession);
    // Dữ liệu cá nhân được namespace theo accountId — đổi tài khoản thì
    // mọi màn hình phải đọc lại dữ liệu của tài khoản mới.
    setActiveAccount(nextSession?.account.accountId ?? null);
  }, []);

  const refreshSession = useCallback((current: AuthSession) => {
    if (!refreshInFlight.current) {
      refreshInFlight.current = refreshRequest(current.refreshToken)
        .finally(() => { refreshInFlight.current = null; });
    }
    return refreshInFlight.current;
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
        commitSession(await refreshSession(session));
      } catch {
        commitSession(null);
      }
    }, refreshIn);

    return () => window.clearTimeout(timeout);
  }, [commitSession, refreshSession, session]);

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
