export interface AccountInfo {
  accountId: string;
  email: string;
  fullName: string;
  displayName: string | null;
  roles: string[];
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: number;
  account: AccountInfo;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  displayName?: string;
  phone?: string;
}

interface ProblemDetails {
  title?: string;
  detail?: string;
  errors?: Record<string, string[]>;
}

const API_BASE_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
const SESSION_KEY = "bonbon.auth.session";

function getDeviceInfo() {
  return `BonBon Web · ${navigator.userAgent}`.slice(0, 512);
}

async function parseError(response: Response) {
  let problem: ProblemDetails | null = null;

  try {
    problem = await response.json() as ProblemDetails;
  } catch {
    // The API can return an empty body for some authorization failures.
  }

  const validationMessage = problem?.errors
    ? Object.values(problem.errors).flat().find(Boolean)
    : undefined;

  return validationMessage
    ?? problem?.detail
    ?? problem?.title
    ?? "Không thể kết nối đến BonBon. Vui lòng thử lại.";
}

async function post<T>(path: string, body: unknown, accessToken?: string) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function readStoredSession(): AuthSession | null {
  try {
    const value = localStorage.getItem(SESSION_KEY);
    return value ? JSON.parse(value) as AuthSession : null;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function storeSession(session: AuthSession | null) {
  if (session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

export function login(payload: LoginPayload) {
  return post<AuthSession>("/auth/login", {
    ...payload,
    deviceInfo: getDeviceInfo(),
  });
}

export function register(payload: RegisterPayload) {
  return post<AuthSession>("/auth/register", {
    ...payload,
    displayName: payload.displayName || null,
    phone: payload.phone || null,
    deviceInfo: getDeviceInfo(),
  });
}

export function googleLogin(idToken: string) {
  return post<AuthSession>("/auth/google-login", {
    idToken,
    deviceInfo: getDeviceInfo(),
  });
}

export function refresh(refreshToken: string) {
  return post<AuthSession>("/auth/refresh", { refreshToken });
}

export function logout(session: AuthSession) {
  return post<void>("/auth/logout", { refreshToken: session.refreshToken }, session.accessToken);
}
