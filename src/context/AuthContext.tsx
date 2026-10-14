import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { authService } from '@/services/authService'
import type { AccountInfo, LoginRequest, RegisterRequest } from '@/types/auth'

// ── Storage keys ─────────────────────────────────────────────────────────────
const KEY_ACCESS  = 'bb_access'
const KEY_REFRESH = 'bb_refresh'
const KEY_ACCOUNT = 'bb_account'

// ── Context shape ─────────────────────────────────────────────────────────────
interface AuthContextValue {
  account: AccountInfo | null
  isAuthenticated: boolean
  isLoading: boolean
  login:        (body: LoginRequest)    => Promise<void>
  register:     (body: RegisterRequest) => Promise<void>
  googleLogin:  (idToken: string)       => Promise<void>
  logout:       ()                      => Promise<void>
  logoutAll:    ()                      => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [account,   setAccount]   = useState<AccountInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)   // hydrate từ localStorage

  // Hydrate khi app khởi động
  useEffect(() => {
    const raw = localStorage.getItem(KEY_ACCOUNT)
    const acc = localStorage.getItem(KEY_ACCESS)
    if (raw && acc) {
      try { setAccount(JSON.parse(raw)) } catch { /* corrupt, ignore */ }
    }
    setIsLoading(false)
  }, [])

  // ── Helpers ────────────────────────────────────────────────────────────────
  const saveSession = useCallback((data: {
    accessToken: string
    refreshToken: string
    account: AccountInfo
  }) => {
    localStorage.setItem(KEY_ACCESS,  data.accessToken)
    localStorage.setItem(KEY_REFRESH, data.refreshToken)
    localStorage.setItem(KEY_ACCOUNT, JSON.stringify(data.account))
    setAccount(data.account)
  }, [])

  const clearSession = useCallback(() => {
    localStorage.removeItem(KEY_ACCESS)
    localStorage.removeItem(KEY_REFRESH)
    localStorage.removeItem(KEY_ACCOUNT)
    setAccount(null)
  }, [])

  // ── Actions ────────────────────────────────────────────────────────────────
  const login = useCallback(async (body: LoginRequest) => {
    const res = await authService.login(body)
    saveSession(res)
  }, [saveSession])

  const register = useCallback(async (body: RegisterRequest) => {
    const res = await authService.register(body)
    saveSession(res)
  }, [saveSession])

  const googleLogin = useCallback(async (idToken: string) => {
    const res = await authService.googleLogin({ idToken })
    saveSession(res)
  }, [saveSession])

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem(KEY_REFRESH)
    if (refreshToken) {
      try { await authService.logout(refreshToken) } catch { /* đã hết hạn, bỏ qua */ }
    }
    clearSession()
  }, [clearSession])

  const logoutAll = useCallback(async () => {
    try { await authService.logoutAll() } catch { /* ignore */ }
    clearSession()
  }, [clearSession])

  const value = useMemo<AuthContextValue>(() => ({
    account,
    isAuthenticated: !!account,
    isLoading,
    login,
    register,
    googleLogin,
    logout,
    logoutAll,
  }), [account, isLoading, login, register, googleLogin, logout, logoutAll])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
