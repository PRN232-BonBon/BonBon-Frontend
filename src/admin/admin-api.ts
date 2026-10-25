import type { AuthSession } from "../auth/auth-api";

const API = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
const KEY = "bonbon.admin.session";
let refreshInFlight: Promise<AuthSession> | null = null;

export interface ReviewVehicle {
  id: string; brand: string; model: string; year: number | null; plateNumber: string;
  bodyType: string; seats: number; transmission: string; fuel: string; pickupAddress: string;
  description: string | null; features: string[]; hourPrice: number; dayPrice: number;
  status: string; ownerName: string; ownerEmail: string; ownerPhone: string | null;
  imageUrls: string[]; weeklyDiscountEnabled: boolean; weeklyDiscountPercent: number | null;
  mileageLimitEnabled: boolean; dailyMileageLimitKm: number | null; overageFeePerKm: number | null;
  rentalTerms: string | null; rejectionReason: string | null; submittedAt: string; reviewedAt: string | null;
}

export function readAdminSession(): AuthSession | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    const session = raw ? JSON.parse(raw) as AuthSession : null;
    return session?.account.roles.includes("Admin") ? session : null;
  } catch { return null; }
}

function saveSession(session: AuthSession | null) {
  if (session) sessionStorage.setItem(KEY, JSON.stringify(session));
  else sessionStorage.removeItem(KEY);
}

async function errorMessage(response: Response) {
  const problem = await response.json().catch(() => null) as { detail?: string; errors?: Record<string, string[]> } | null;
  return problem?.detail || (problem?.errors ? Object.values(problem.errors).flat()[0] : null)
    || (response.status === 403 ? "Bạn không có quyền quản trị." : response.status === 429 ? "Bạn thử đăng nhập quá nhiều lần. Vui lòng thử lại sau một phút." : "Không thể kết nối đến BonBon. Vui lòng thử lại.");
}

export async function adminLogin(username: string, password: string) {
  const response = await fetch(`${API}/admin/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
  if (!response.ok) throw new Error(await errorMessage(response));
  const session = await response.json() as AuthSession;
  saveSession(session);
  return session;
}

async function refreshSession(session: AuthSession) {
  if (!refreshInFlight) refreshInFlight = (async () => {
    const response = await fetch(`${API}/auth/refresh`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refreshToken: session.refreshToken }) });
    if (!response.ok) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    const next = await response.json() as AuthSession;
    if (!next.account.roles.includes("Admin")) throw new Error("Tài khoản không còn quyền quản trị.");
    saveSession(next);
    return next;
  })().finally(() => { refreshInFlight = null; });
  return refreshInFlight;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let session = readAdminSession();
  if (!session) throw new Error("Vui lòng đăng nhập lại.");
  try {
    if (session.accessTokenExpiresAt * 1000 <= Date.now() + 30000) session = await refreshSession(session);
    const send = () => fetch(`${API}${path}`, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${session!.accessToken}` } });
    let response = await send();
    if (response.status === 401) { session = await refreshSession(session); response = await send(); }
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        saveSession(null); window.dispatchEvent(new Event("bonbon-admin:expired"));
      }
      throw new Error(await errorMessage(response));
    }
    return response.json() as Promise<T>;
  } catch (error) {
    if (error instanceof Error && /hết hạn|không còn quyền/.test(error.message)) {
      saveSession(null); window.dispatchEvent(new Event("bonbon-admin:expired"));
    }
    throw error;
  }
}

export const getReviewVehicles = () => request<ReviewVehicle[]>("/admin/vehicles");
export const reviewVehicle = (id: string, decision: "approve" | "reject", reason?: string) =>
  request<{ status: string }>(`/admin/vehicles/${id}/review`, { method: "POST", body: JSON.stringify({ decision, reason }) });

export async function adminLogout() {
  const session = readAdminSession();
  saveSession(null);
  if (session) await fetch(`${API}/auth/logout`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.accessToken}` }, body: JSON.stringify({ refreshToken: session.refreshToken }) }).catch(() => null);
}

export function vehicleImageUrl(url: string) {
  if (url.startsWith("/api/")) return `${API.replace(/\/api$/, "")}${url}`;
  if (url.startsWith("/")) return `https://bonbon.kitsuracloud.com${url}`;
  return url;
}
