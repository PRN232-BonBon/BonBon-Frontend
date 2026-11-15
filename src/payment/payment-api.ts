import type { AuthSession } from "../auth/auth-api";

const API = (import.meta.env?.VITE_API_URL || "/api").replace(/\/$/, "");
export interface PaymentCheckout {
  paymentId: string; bookingId: string; amount: number; currency: string; status: string;
  checkoutUrl: string | null; expiresAt: string; isReplay: boolean;
}
export interface PaymentStatus {
  paymentId: string; bookingId: string; amount: number; currency: string; status: string;
  expiresAt: string; requiresReconciliation: boolean;
}
export class PaymentApiError extends Error {
  code: string;
  constructor(code: string, message: string) { super(message); this.name = "PaymentApiError"; this.code = code; }
}

export function safeCheckoutUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "sandbox.vnpayment.vn" && !url.port && !url.username && !url.password
      && url.pathname === "/paymentv2/vpcpay.html" ? url.href : null;
  } catch { return null; }
}

async function request<T>(path: string, session: AuthSession, init: RequestInit = {}): Promise<T> {
  const signal = init.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000);
  const response = await fetch(`${API}${path}`, { ...init, signal, headers: {
    "Content-Type": "application/json", Authorization: `Bearer ${session.accessToken}`, ...init.headers,
  } });
  if (!response.ok) {
    const problem = await response.json().catch(() => null) as { title?: string; detail?: string } | null;
    throw new PaymentApiError(problem?.title ?? "PAYMENT_UNAVAILABLE", problem?.detail ?? "Không thể kết nối dịch vụ thanh toán. Vui lòng thử lại.");
  }
  return response.json() as Promise<T>;
}

const keys = new Map<string, string>();
const pending = new Map<string, Promise<PaymentCheckout>>();
function keyFor(session: AuthSession, bookingId: string) {
  const scope = `bonbon.payment.${session.account.accountId}.${bookingId}`;
  let key = keys.get(scope);
  if (!key) {
    try { key = sessionStorage.getItem(scope) ?? undefined; } catch { /* In-memory fallback if browser storage is disabled. */ }
    if (!key || !/^[A-Za-z0-9_-]{16,100}$/.test(key)) key = crypto.randomUUID();
    keys.set(scope, key);
    try { sessionStorage.setItem(scope, key); } catch { /* Do not lose idempotency within this page. */ }
  }
  return { scope, key };
}

// Reuse the same key after network failures, double clicks, remounts and refreshes.
// Never automatically create a new payment attempt after an uncertain result.
export function createPayment(bookingId: string, session: AuthSession) {
  const { scope, key } = keyFor(session, bookingId);
  const existing = pending.get(scope);
  if (existing) return existing;
  const promise = request<PaymentCheckout>("/payments", session, {
    method: "POST", headers: { "Idempotency-Key": key }, body: JSON.stringify({ bookingId }),
  }).finally(() => { if (pending.get(scope) === promise) pending.delete(scope); });
  pending.set(scope, promise);
  return promise;
}

export function getPaymentStatus(paymentId: string, session: AuthSession, signal?: AbortSignal) {
  return request<PaymentStatus>(`/payments/${encodeURIComponent(paymentId)}`, session, { signal });
}
export function verifiedPaymentSucceeded(payment: PaymentStatus | null) {
  return payment?.status === "Succeeded" && !payment.requiresReconciliation;
}
export function paymentErrorMessage(error: unknown) {
  return error instanceof TypeError ? "Không thể kết nối đến BonBon. Vui lòng kiểm tra trạng thái trước khi thử lại."
    : error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError")
      ? "Kết nối quá lâu. Vui lòng kiểm tra trạng thái, không tạo giao dịch mới nếu chưa rõ kết quả."
      : error instanceof Error ? error.message : "Không thể kiểm tra thanh toán lúc này.";
}
