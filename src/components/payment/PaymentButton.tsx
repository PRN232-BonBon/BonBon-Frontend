import { useEffect, useRef, useState } from "react";
import { ArrowSquareOut, CreditCard } from "@phosphor-icons/react";
import { useAuth } from "../../auth/AuthContext";
import type { CustomerBooking } from "../../portal/portal-api";
import { createPayment, getPayment, PaymentApiError } from "../../payment/payment-api";
import { getPaymentAction, paymentNavigation, paymentResultPath, readPaymentAction, savePaymentAction, trustedCheckoutUrl } from "../../payment/payment-session";

// Rendered only from /bookings/mine. Backend independently enforces ownership and payability.
export function PaymentButton({ booking }: { booking: CustomerBooking }) {
  const { session } = useAuth();
  const accountId = session?.account.accountId;
  const eligible = !!session?.account.roles.includes("Customer") && booking.status === "AwaitingPayment";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const inFlight = useRef(false);
  const current = useRef<AbortController | null>(null);

  useEffect(() => {
    current.current?.abort(); inFlight.current = false;
    setBusy(false); setError(null); setPaymentId(null);
    if (accountId && eligible) {
      try { setPaymentId(readPaymentAction(accountId, booking.bookingId)?.paymentId ?? null); }
      catch { /* Fail closed when clicked; do not generate a replacement key. */ }
    }
    return () => current.current?.abort();
  }, [accountId, booking.bookingId, eligible]);

  async function pay() {
    if (!session || !eligible || inFlight.current) return;
    inFlight.current = true;
    setBusy(true); setError(null);
    const controller = new AbortController();
    current.current = controller;
    let leaving = false;
    try {
      // Persist before POST. Network failures never rotate this key, even after reload.
      const action = getPaymentAction(session.account.accountId, booking.bookingId);
      if (action.paymentId) {
        const status = await getPayment(session, action.paymentId, controller.signal);
        if (controller.signal.aborted) return;
        if (status.bookingId !== booking.bookingId) throw new PaymentApiError("INVALID_RESPONSE");
        if (status.status !== "Pending" || status.requiresReconciliation || Date.parse(status.expiresAt) <= Date.now()) {
          paymentNavigation.toResult(status.paymentId); leaving = true; return;
        }
      }
      const checkout = await createPayment(session, { bookingId: booking.bookingId }, action.idempotencyKey, controller.signal);
      if (controller.signal.aborted) return;
      setPaymentId(checkout.paymentId);
      savePaymentAction(session.account.accountId, booking.bookingId, { ...action, paymentId: checkout.paymentId });
      if (checkout.amount !== booking.totalAmount || checkout.currency !== booking.currency) throw new PaymentApiError("BOOKING_AMOUNT_CHANGED", 409);
      if (checkout.status !== "Pending" || !checkout.checkoutUrl || Date.parse(checkout.expiresAt) <= Date.now()) {
        paymentNavigation.toResult(checkout.paymentId); leaving = true; return;
      }
      paymentNavigation.toGateway(trustedCheckoutUrl(checkout.checkoutUrl));
      leaving = true;
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof PaymentApiError ? cause.message : new PaymentApiError("NETWORK_ERROR").message);
    } finally {
      if (current.current === controller && !leaving) {
        inFlight.current = false;
        if (!controller.signal.aborted) setBusy(false);
      }
    }
  }

  if (!eligible) return null;
  return <div className="payment-action">
    <button className="button portal-primary payment-pay-button" disabled={busy} aria-busy={busy} type="button" onClick={() => void pay()}>
      <CreditCard size={19} aria-hidden="true" />
      {busy ? "Đang kiểm tra..." : paymentId ? "Kiểm tra / tiếp tục" : "Thanh toán VNPay"}
    </button>
    <span className="payment-sandbox-label">VNPay sandbox · toàn bộ tiền thuê</span>
    {paymentId ? <a className="payment-status-link" href={paymentResultPath(paymentId)}>Xem trạng thái <ArrowSquareOut aria-hidden="true" /></a> : null}
    {error ? <p className="payment-inline-error" role="alert">{error}</p> : null}
  </div>;
}
