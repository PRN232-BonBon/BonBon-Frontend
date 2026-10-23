import type { AuthSession } from "../auth/auth-api";
import type { CreatePaymentRequest, PaymentCheckoutResponse, PaymentReturnResponse, PaymentStatusResponse } from "./payment-types";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const statuses = new Set(["Pending", "Processing", "Succeeded", "Failed", "Cancelled"]);
export const isPaymentId = (value: string): boolean => UUID.test(value) && value !== "00000000-0000-0000-0000-000000000000";

export class PaymentApiError extends Error {
  constructor(public readonly code: string, public readonly status: number | null = null) {
    super(paymentErrorMessage(code, status));
    this.name = "PaymentApiError";
  }
}

export function paymentErrorMessage(code: string, status: number | null = null): string {
  if (code === "STORAGE_UNAVAILABLE") return "Không thể lưu yêu cầu thanh toán trên trình duyệt. Vui lòng cho phép lưu trữ rồi thử lại.";
  if (code === "UNTRUSTED_CHECKOUT") return "Đường dẫn thanh toán không hợp lệ. BonBon chưa chuyển hướng; vui lòng liên hệ hỗ trợ.";
  if (code === "INVALID_RESPONSE") return "Chưa xác minh được dữ liệu thanh toán. Vui lòng kiểm tra trạng thái, không tạo giao dịch mới.";
  if (code === "INVALID_RETURN") return "Đường dẫn kết quả không hợp lệ hoặc thiếu mã thanh toán. Vui lòng mở lại từ Chuyến của tôi.";
  if (code === "PAYMENT_IN_PROGRESS") return "Đã có giao dịch đang xử lý. Hãy kiểm tra giao dịch trước; không thanh toán lại khi chưa rõ kết quả.";
  if (code === "PAYMENT_RECONCILIATION_REQUIRED") return "Giao dịch cần được đối soát. Vui lòng không thanh toán lại và liên hệ BonBon để được hỗ trợ.";
  if (code === "BOOKING_ALREADY_PAID") return "Đơn đặt xe đã có khoản thanh toán thành công. Vui lòng kiểm tra giao dịch hoặc tải lại chuyến.";
  if (code === "BOOKING_NOT_PAYABLE") return "Đơn đặt xe hiện không thể thanh toán. Vui lòng tải lại danh sách chuyến để xem trạng thái mới nhất.";
  if (code === "BOOKING_AMOUNT_CHANGED") return "Số tiền thuê vừa thay đổi. Vui lòng tải lại Chuyến của tôi để kiểm tra trước khi tiếp tục thanh toán.";
  if (status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để kiểm tra thanh toán.";
  if (status === 403) return "Bạn không có quyền thanh toán hoặc xem giao dịch này. Vui lòng kiểm tra tài khoản đang đăng nhập.";
  if (status === 404) return "Không tìm thấy giao dịch hoặc đơn đặt xe của tài khoản hiện tại.";
  if (status === 503) return "Thanh toán trực tuyến hiện chưa khả dụng. Vui lòng quay lại sau; chưa có xác nhận thanh toán thành công.";
  if (status === 409) return "Giao dịch chưa thể tiếp tục ở trạng thái hiện tại. Hãy kiểm tra kết quả trước khi thử lại.";
  if (status === 400) return "Yêu cầu thanh toán không hợp lệ. Vui lòng mở lại từ Chuyến của tôi.";
  if (status !== null) return "Dịch vụ thanh toán đang gặp sự cố. Vui lòng kiểm tra trạng thái sau, không tạo giao dịch mới.";
  return "Không thể kết nối để xác minh thanh toán. Khi thử lại, BonBon sẽ giữ nguyên yêu cầu cũ; vui lòng không thanh toán lại ở nơi khác.";
}

async function request(path: string, session: AuthSession | null, init: RequestInit = {}, signal?: AbortSignal): Promise<unknown> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init, signal: controller.signal, cache: "no-store", redirect: "error", credentials: "omit",
      headers: { Accept: "application/json", ...(session ? { Authorization: `Bearer ${session.accessToken}` } : {}), ...init.headers },
    });
    if (!response.ok) {
      const problem = await response.json().catch(() => null) as { title?: unknown } | null;
      throw new PaymentApiError(typeof problem?.title === "string" ? problem.title : "HTTP_ERROR", response.status);
    }
    return await response.json().catch(() => { throw new PaymentApiError("INVALID_RESPONSE"); });
  } catch (error) {
    if (signal?.aborted) throw new DOMException("Request aborted", "AbortError");
    if (error instanceof PaymentApiError) throw error;
    throw new PaymentApiError("NETWORK_ERROR");
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new PaymentApiError("INVALID_RESPONSE");
  return value as Record<string, unknown>;
}
function common(value: Record<string, unknown>): boolean {
  return typeof value.paymentId === "string" && isPaymentId(value.paymentId) && typeof value.status === "string" && statuses.has(value.status);
}
function amount(value: Record<string, unknown>): boolean {
  return typeof value.bookingId === "string" && isPaymentId(value.bookingId) &&
    typeof value.amount === "number" && Number.isSafeInteger(value.amount) && value.amount > 0 && value.currency === "VND" &&
    typeof value.expiresAt === "string" && Number.isFinite(Date.parse(value.expiresAt));
}

export async function createPayment(session: AuthSession, payload: CreatePaymentRequest, idempotencyKey: string, signal?: AbortSignal): Promise<PaymentCheckoutResponse> {
  if (!isPaymentId(payload.bookingId) || !/^[A-Za-z0-9_-]{16,100}$/.test(idempotencyKey)) throw new PaymentApiError("PAYMENT_REQUEST_INVALID", 400);
  const data = object(await request("/payments", session, {
    method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({ bookingId: payload.bookingId }),
  }, signal));
  if (!common(data) || !amount(data) || data.bookingId !== payload.bookingId || typeof data.isReplay !== "boolean" ||
      !(data.checkoutUrl === null || typeof data.checkoutUrl === "string")) throw new PaymentApiError("INVALID_RESPONSE");
  return data as unknown as PaymentCheckoutResponse;
}

export async function getPayment(session: AuthSession, paymentId: string, signal?: AbortSignal): Promise<PaymentStatusResponse> {
  if (!isPaymentId(paymentId)) throw new PaymentApiError("INVALID_RETURN");
  const data = object(await request(`/payments/${encodeURIComponent(paymentId)}`, session, {}, signal));
  if (!common(data) || !amount(data) || data.paymentId !== paymentId || typeof data.requiresReconciliation !== "boolean")
    throw new PaymentApiError("INVALID_RESPONSE");
  return data as unknown as PaymentStatusResponse;
}

// Resolution only: Backend verifies these signed fields; its response never substitutes for JWT GET status.
export async function resolveVnPayReturn(parameters: URLSearchParams, signal?: AbortSignal): Promise<PaymentReturnResponse> {
  const forwarded = new URLSearchParams();
  const keys = new Set<string>();
  for (const [key, value] of parameters) {
    if (!key.startsWith("vnp_")) continue;
    if (keys.has(key.toLowerCase())) throw new PaymentApiError("INVALID_RETURN");
    keys.add(key.toLowerCase()); forwarded.append(key, value);
  }
  if (!forwarded.has("vnp_SecureHash") || forwarded.size > 40 || forwarded.toString().length > 8192) throw new PaymentApiError("INVALID_RETURN");
  const data = object(await request(`/payments/vnpay/return?${forwarded}`, null, {}, signal));
  if (!common(data) || typeof data.requiresReconciliation !== "boolean" || typeof data.message !== "string") throw new PaymentApiError("INVALID_RESPONSE");
  return data as unknown as PaymentReturnResponse;
}
