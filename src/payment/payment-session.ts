import { isPaymentId, PaymentApiError } from "./payment-api";

export interface StoredPaymentAction { idempotencyKey: string; paymentId?: string }
const storageKey = (accountId: string, bookingId: string) => `bonbon.payment.v1:${accountId}:${bookingId}`;

export function readPaymentAction(accountId: string, bookingId: string): StoredPaymentAction | null {
  try {
    const raw = localStorage.getItem(storageKey(accountId, bookingId));
    if (!raw) return null;
    const action: unknown = JSON.parse(raw);
    if (!action || typeof action !== "object" || Array.isArray(action)) throw new Error("Invalid stored action");
    const { idempotencyKey, paymentId } = action as Record<string, unknown>;
    if (typeof idempotencyKey !== "string" || !/^[A-Za-z0-9_-]{16,100}$/.test(idempotencyKey) || /\s/.test(idempotencyKey) ||
        (paymentId !== undefined && (typeof paymentId !== "string" || !isPaymentId(paymentId))))
      throw new Error("Invalid stored action");
    return paymentId === undefined ? { idempotencyKey } : { idempotencyKey, paymentId: paymentId as string };
  } catch { throw new PaymentApiError("STORAGE_UNAVAILABLE"); }
}

export function getPaymentAction(accountId: string, bookingId: string): StoredPaymentAction {
  const previous = readPaymentAction(accountId, bookingId);
  if (previous) return previous;
  const action = { idempotencyKey: crypto.randomUUID() };
  savePaymentAction(accountId, bookingId, action);
  return action;
}

export function savePaymentAction(accountId: string, bookingId: string, action: StoredPaymentAction): void {
  try { localStorage.setItem(storageKey(accountId, bookingId), JSON.stringify(action)); }
  catch { throw new PaymentApiError("STORAGE_UNAVAILABLE"); }
}

export function paymentResultPath(paymentId: string): string {
  if (!isPaymentId(paymentId)) throw new PaymentApiError("INVALID_RETURN");
  return `/payment/result?paymentId=${encodeURIComponent(paymentId)}`;
}

const sandbox = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
export function trustedCheckoutUrl(value: string, configured = import.meta.env.VITE_VNPAY_SANDBOX_URL || sandbox): string {
  try {
    // Configuration may select this integration only; it cannot broaden the sandbox allowlist.
    if (configured !== sandbox) throw new Error("Unsupported integration");
    const url = new URL(value);
    const expected = new URL(configured);
    if (url.origin !== expected.origin || url.pathname !== expected.pathname || url.username || url.password || url.hash)
      throw new Error("Untrusted URL");
    return url.href;
  } catch { throw new PaymentApiError("UNTRUSTED_CHECKOUT"); }
}

export const paymentNavigation = {
  toGateway(url: string) { window.location.assign(trustedCheckoutUrl(url)); },
  toResult(id: string) { window.location.assign(paymentResultPath(id)); },
};
