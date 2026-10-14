import axios, { AxiosError } from 'axios'
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  GoogleLoginRequest,
  ApiError,
} from '@/types/auth'

// Vite proxy chuyển /api → http://localhost:5188/api
const api = axios.create({ baseURL: '/api/auth' })

// ── Interceptor: tự gắn Bearer token vào mọi request ────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bb_access')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Helper: chuẩn hoá lỗi từ ProblemDetails ─────────────────────────────────
function extractError(err: unknown): ApiError {
  const axiosErr = err as AxiosError<ApiError>
  if (axiosErr.response?.data) {
    return axiosErr.response.data
  }
  return { title: 'Lỗi kết nối', detail: 'Không thể kết nối tới server.', status: 0 }
}

// ── Auth calls ───────────────────────────────────────────────────────────────
export const authService = {
  async register(body: RegisterRequest): Promise<AuthResponse> {
    try {
      const { data } = await api.post<AuthResponse>('/register', body)
      return data
    } catch (err) {
      throw extractError(err)
    }
  },

  async login(body: LoginRequest): Promise<AuthResponse> {
    try {
      const { data } = await api.post<AuthResponse>('/login', body)
      return data
    } catch (err) {
      throw extractError(err)
    }
  },

  async googleLogin(body: GoogleLoginRequest): Promise<AuthResponse> {
    try {
      const { data } = await api.post<AuthResponse>('/google-login', body)
      return data
    } catch (err) {
      throw extractError(err)
    }
  },

  async refresh(refreshToken: string): Promise<AuthResponse> {
    try {
      const { data } = await api.post<AuthResponse>('/refresh', { refreshToken })
      return data
    } catch (err) {
      throw extractError(err)
    }
  },

  async logout(refreshToken: string): Promise<void> {
    try {
      await api.post('/logout', { refreshToken })
    } catch (err) {
      throw extractError(err)
    }
  },

  async logoutAll(): Promise<void> {
    try {
      await api.post('/logout-all')
    } catch (err) {
      throw extractError(err)
    }
  },
}
