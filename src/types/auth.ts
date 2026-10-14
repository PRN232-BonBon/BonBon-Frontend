export interface AccountInfo {
  accountId: string
  email: string
  fullName: string
  displayName?: string
  roles: string[]
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  accessTokenExpiresAt: number
  account: AccountInfo
}

export interface LoginRequest {
  email: string
  password: string
  deviceInfo?: string
}

export interface RegisterRequest {
  email: string
  password: string
  fullName: string
  displayName?: string
  phone?: string
}

export interface GoogleLoginRequest {
  idToken: string
}

export interface ApiError {
  title: string
  detail?: string
  status: number
}
