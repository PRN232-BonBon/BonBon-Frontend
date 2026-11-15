import type { AuthSession } from "../auth/auth-api";

export type PaymentProvider = "VNPAY_SANDBOX";
export const checkoutProvider: PaymentProvider = "VNPAY_SANDBOX";
const route = (_provider: PaymentProvider) => "/payments";
const API = (import.meta.env?.VITE_API_URL || "/api").replace(/\/$/, "");
export interface PaymentCheckout {
  paymentId: string; bookingId: string; amount: number; currency: string; status: string;
  checkoutUrl: string | null; expiresAt: string; isReplay: boolean;
}
export interface PaymentStatus {
  paymentId: string; bookingId: string; amount: number; currency: string; status: string;
  expiresAt: string; requiresReconciliation: boolean;
}
const statuses = new Set(["Pending", "Processing", "Succeeded", "Failed", "Cancelled"]);
export const isPaymentId = (value: unknown): value is string => typeof value === "string" && value.length === 36
  && /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(value)
  && value !== "00000000-0000-0000-0000-000000000000";
export function paymentIdFromSearch(search: string): string | null {
  const params = new URLSearchParams(search), ids = params.getAll("paymentId");
  return !params.has("returnError") && ids.length === 1 && isPaymentId(ids[0]) ? ids[0] : null;
}
export class PaymentApiError extends Error {
  code: string;
  status: number | null;
  constructor(code: string, message?: string, status: number | null = null) {
    super(message ?? errorMessage(code, status)); this.name = "PaymentApiError"; this.code = code; this.status = status;
  }
}
function errorMessage(code: string, status: number | null) {
  if (code === "STORAGE_UNAVAILABLE") return "Không thể lưu yêu cầu thanh toán an toàn. Vui lòng cho phép lưu trữ; không tạo giao dịch mới khi kết quả chưa rõ.";
  if (code === "INVALID_RESPONSE") return "Chưa xác minh được dữ liệu thanh toán. Vui lòng kiểm tra trạng thái và không thanh toán lại.";
  if (code === "PAYMENT_RECONCILIATION_REQUIRED") return "Giao dịch cần đối soát. Vui lòng liên hệ BonBon và không thanh toán lại.";
  if (code === "PAYMENT_IN_PROGRESS") return "Đã có giao dịch đang xử lý. Vui lòng kiểm tra kết quả trước, không thanh toán lại.";
  if (status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để kiểm tra thanh toán.";
  if (status === 403) return "Bạn không có quyền thanh toán hoặc xem giao dịch này.";
  if (status === 404) return "Không tìm thấy thanh toán của tài khoản hiện tại. Vui lòng liên hệ hỗ trợ nếu đã gửi yêu cầu.";
  if (status === 503) return "Thanh toán trực tuyến hiện chưa khả dụng. Chưa có xác nhận thanh toán thành công.";
  if (status === 409) return "Đơn hoặc giao dịch chưa thể tiếp tục ở trạng thái hiện tại. Vui lòng kiểm tra lại kết quả.";
  return "Không thể xác minh thanh toán. Vui lòng kiểm tra trạng thái trước khi thử lại.";
}

export function safeCheckoutUrl(value: string | null, _provider: PaymentProvider = checkoutProvider): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "sandbox.vnpayment.vn" && !url.port && !url.username && !url.password
      && !url.hash && url.pathname === "/paymentv2/vpcpay.html" ? url.href : null;
  } catch { return null; }
}

async function request<T>(path: string, session: AuthSession, init: RequestInit = {}): Promise<T> {
  const signal = init.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000);
  const response = await fetch(`${API}${path}`, { ...init, signal, cache: "no-store", redirect: "error", credentials: "omit", headers: {
    "Content-Type": "application/json", Authorization: `Bearer ${session.accessToken}`, ...init.headers,
  } });
  if (!response.ok) {
    const problem = await response.json().catch(() => null) as { title?: unknown } | null;
    throw new PaymentApiError(typeof problem?.title === "string" ? problem.title : "PAYMENT_UNAVAILABLE", undefined, response.status);
  }
  return response.json().catch(() => { throw new PaymentApiError("INVALID_RESPONSE"); }) as Promise<T>;
}

const pending = new Map<string, Promise<PaymentCheckout>>();
interface Action { key: string; paymentId?: string }
function keyFor(session: AuthSession, bookingId: string, provider: PaymentProvider) {
  const legacyScope = `bonbon.payment.${session.account.accountId}.${bookingId}`;
  const scope = `bonbon.payment.web.v1:${session.account.accountId}:${bookingId}`;
  try {
    const raw = localStorage.getItem(scope);
    let action: Action;
    if (raw !== null) {
      const value: unknown = JSON.parse(raw);
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid action");
      action = value as Action;
    } else {
      // Keep the key of the team's previous implementation when migrating storage.
      action = { key: (provider === "VNPAY_SANDBOX" ? sessionStorage.getItem(legacyScope) : null) ?? crypto.randomUUID() };
    }
    if (typeof action.key !== "string" || action.key.length < 16 || action.key.length > 100 || /[^A-Za-z0-9_-]/.test(action.key)
      || (action.paymentId !== undefined && !isPaymentId(action.paymentId))) throw new Error("Invalid action");
    localStorage.setItem(scope, JSON.stringify(action)); // Must persist before POST; no memory-only fallback.
    return { scope, action };
  } catch { throw new PaymentApiError("STORAGE_UNAVAILABLE"); }
}
function validSnapshot(value: unknown): value is PaymentStatus {
  if (!value || typeof value !== "object") return false;
  const p = value as PaymentStatus;
  return isPaymentId(p.paymentId) && isPaymentId(p.bookingId) && Number.isSafeInteger(p.amount) && p.amount > 0
    && p.amount <= 9999999999 && p.currency === "VND" && statuses.has(p.status)
    && typeof p.expiresAt === "string" && Number.isFinite(Date.parse(p.expiresAt));
}
function requireCustomer(session: AuthSession) {
  if (!session.account.roles?.includes("Customer")) throw new PaymentApiError("PAYMENT_FORBIDDEN", undefined, 403);
}
async function checkoutFor(bookingId: string, session: AuthSession, scope: string, action: Action, provider: PaymentProvider): Promise<PaymentCheckout> {
  if (action.paymentId) {
    const previous = await getPaymentStatus(action.paymentId, session, undefined, provider);
    if (previous.bookingId.toLowerCase() !== bookingId.toLowerCase()) throw new PaymentApiError("INVALID_RESPONSE");
    if (previous.status !== "Pending" || previous.requiresReconciliation || Date.parse(previous.expiresAt) <= Date.now())
      return { ...previous, checkoutUrl: null, isReplay: true };
  }
  const payment = await request<PaymentCheckout>(route(provider), session, {
    method: "POST", headers: { "Idempotency-Key": action.key }, body: JSON.stringify({ bookingId }),
  });
  if (!validSnapshot(payment) || payment.bookingId.toLowerCase() !== bookingId.toLowerCase() || typeof payment.isReplay !== "boolean"
    || !(payment.checkoutUrl === null || typeof payment.checkoutUrl === "string")) throw new PaymentApiError("INVALID_RESPONSE");
  try { localStorage.setItem(scope, JSON.stringify({ ...action, paymentId: payment.paymentId })); }
  catch { throw new PaymentApiError("STORAGE_UNAVAILABLE"); }
  return payment;
}

// Reuse the same key after network failures, double clicks, remounts and refreshes.
// Never automatically create a new payment attempt after an uncertain result.
export async function createPayment(bookingId: string, session: AuthSession, provider: PaymentProvider = checkoutProvider) {
  requireCustomer(session);
  if (!isPaymentId(bookingId)) throw new PaymentApiError("INVALID_RESPONSE");
  const { scope, action } = keyFor(session, bookingId, provider);
  const existing = pending.get(scope);
  if (existing) return existing;
  const promise = checkoutFor(bookingId, session, scope, action, provider)
    .finally(() => { if (pending.get(scope) === promise) pending.delete(scope); });
  pending.set(scope, promise);
  return promise;
}

export async function getPaymentStatus(paymentId: string, session: AuthSession, signal?: AbortSignal, provider: PaymentProvider = "VNPAY_SANDBOX") {
  requireCustomer(session);
  if (!isPaymentId(paymentId)) throw new PaymentApiError("INVALID_RESPONSE");
  const payment = await request<PaymentStatus>(`${route(provider)}/${encodeURIComponent(paymentId)}`, session, { signal });
  if (!validSnapshot(payment) || payment.paymentId.toLowerCase() !== paymentId.toLowerCase() || typeof payment.requiresReconciliation !== "boolean")
    throw new PaymentApiError("INVALID_RESPONSE");
  return payment;
}
export function verifiedPaymentSucceeded(payment: PaymentStatus | null) {
  return payment?.status === "Succeeded" && payment.requiresReconciliation === false;
}
export function paymentErrorMessage(error: unknown) {
  return error instanceof TypeError ? "Không thể kết nối đến BonBon. Vui lòng kiểm tra trạng thái trước khi thử lại."
    : error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError")
      ? "Kết nối quá lâu. Vui lòng kiểm tra trạng thái, không tạo giao dịch mới nếu chưa rõ kết quả."
      : error instanceof Error ? error.message : "Không thể kiểm tra thanh toán lúc này.";
}
