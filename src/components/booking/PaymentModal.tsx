import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ArrowSquareOut, CheckCircle, Clock, ShieldCheck, SpinnerGap, WarningCircle } from "@phosphor-icons/react";
import { useAuth } from "../../auth/AuthContext";
import { getBookingDetail } from "../../portal/portal-api";
import { canPayBooking } from "../../booking/booking-status";
import { formatBookingMoney as money } from "../../booking/booking-display";
import { createPayment, paymentErrorMessage, safeCheckoutUrl, verifiedPaymentSucceeded, type PaymentCheckout } from "../../payment/payment-api";
import { usePaymentStatus } from "../../payment/usePaymentStatus";
import { BookingModalShell } from "./BookingModalShell";
import "./payment.css";
import { LocalIpnSimulation } from "../../payment/LocalIpnSimulation";

export function PaymentModal({ bookingId, onClose, onPaid }: { bookingId: string; onClose: () => void; onPaid: () => void }) {
  const { session } = useAuth();
  const localSimulation = import.meta.env.DEV && import.meta.env.VITE_LOCAL_IPN_SIMULATION === "true"
    && ["127.0.0.1", "localhost"].includes(window.location.hostname);
  const [checkout, setCheckout] = useState<PaymentCheckout | null>(null);
  const [error, setError] = useState(""); const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true); const [now, setNow] = useState(Date.now());
  const { status, error: statusError, checking, refresh } = usePaymentStatus(checkout?.paymentId ?? null, session);
  const notified = useRef(false);
  const paid = verifiedPaymentSucceeded(status);
  const url = safeCheckoutUrl(checkout?.checkoutUrl ?? null);
  const remaining = checkout ? Math.max(0, Math.ceil((Date.parse(checkout.expiresAt) - now) / 1000)) : 0;
  const failed = status && ["Failed", "Cancelled", "Refunded"].includes(status.status);
  const reconciliation = status?.requiresReconciliation;
  useEffect(() => {
    if (!session) return;
    const controller = new AbortController(); let active = true;
    setLoading(true); setError(""); setCheckout(null);
    const start = async () => {
      try {
        // Recheck the saved order and eligibility, even when opened by the quick action.
        const detail = await getBookingDetail(bookingId, session, controller.signal);
        if (!active) return;
        if (!canPayBooking(detail)) throw new Error("Đơn chưa được duyệt, đã thanh toán hoặc đã quá giờ nhận xe. Vui lòng kiểm tra lại trạng thái.");
        const payment = await createPayment(bookingId, session);
        if (!active) return;
        if (payment.bookingId !== bookingId || payment.amount !== detail.quotedRentalAmount || payment.currency !== "VND")
          throw new Error("Thông tin thanh toán không khớp đơn hàng. Vui lòng liên hệ quản trị viên.");
        if (payment.checkoutUrl && !safeCheckoutUrl(payment.checkoutUrl)) throw new Error("Địa chỉ thanh toán không thuộc cổng VNPay được phép.");
        setNow(Date.now()); setCheckout(payment);
      } catch (reason) { if (active) setError(paymentErrorMessage(reason)); }
      finally { if (active) setLoading(false); }
    };
    void start();
    return () => { active = false; controller.abort(); };
  }, [bookingId, session, attempt]);
  useEffect(() => {
    if (!checkout || paid) return;
    const timer = window.setInterval(() => {
      setNow(Date.now());
      if (Date.parse(checkout.expiresAt) <= Date.now()) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [checkout, paid]);
  useEffect(() => { if (paid && !notified.current) { notified.current = true; onPaid(); } }, [paid, onPaid]);
  return <BookingModalShell title="Thanh toán đơn hàng" onClose={onClose} className="payment-modal">
    <div className="payment-content">
      <span className="payment-environment"><ShieldCheck size={16} />VNPay Sandbox · Môi trường thử nghiệm</span>
      {loading ? <div className="booking-confirmation-loading" role="status"><SpinnerGap className="booking-confirmation-spinner" size={25} />Đang tạo phiên thanh toán an toàn…</div> : null}
      {error ? <div className="booking-confirmation-error" role="alert"><p>{error}</p><button type="button" onClick={() => setAttempt(value => value + 1)}>Kiểm tra và thử lại</button></div> : null}
      {checkout ? <>
        <p className="payment-caption">Tổng tiền thanh toán</p><strong className="payment-amount">{money(checkout.amount)}</strong>
        <p className="payment-reference">Mã giao dịch: {checkout.paymentId}</p>
        {paid ? <div className="payment-outcome payment-success" role="status"><CheckCircle size={60} weight="duotone" /><h3>Thanh toán thành công</h3><p>Chuyến đi của bạn đã được xác nhận. Chúc bạn có một hành trình vui vẻ!</p></div>
          : reconciliation ? <div className="payment-outcome" role="status"><WarningCircle size={48} /><h3>Giao dịch cần đối soát</h3><p>Chưa thể xác nhận kết quả. Không thanh toán lại để tránh trùng giao dịch.</p></div>
          : failed ? <div className="payment-outcome" role="status"><WarningCircle size={48} /><h3>Thanh toán chưa thành công</h3><p>Giao dịch không thành công hoặc đã bị hủy. Vui lòng kiểm tra lại đơn hàng của bạn.</p></div>
          : remaining === 0 ? <div className="payment-outcome" role="status"><Clock size={48} /><h3>Phiên thanh toán đã hết hạn</h3><p>Vui lòng kiểm tra kết quả trước khi thực hiện giao dịch khác.</p></div>
          : status && status.status === "Pending" && url ? <>
            <div className="payment-qr" aria-label="QR mở phiên thanh toán VNPay"><QRCodeSVG value={url} size={248} level="M" marginSize={4} title="Quét bằng camera để mở trang thanh toán VNPay" /></div>
            <p className="payment-instructions">Quét bằng <strong>camera điện thoại</strong> để mở VNPay và tiếp tục thanh toán.</p>
            <p className="payment-disclaimer">Đây là QR mở cổng thanh toán, không phải QR chuyển khoản trực tiếp. QR ngân hàng được VNPay cung cấp ở bước tiếp theo.</p>
            <div className="payment-expiry"><Clock size={17} />Phiên còn {Math.floor(remaining / 60).toString().padStart(2, "0")}:{(remaining % 60).toString().padStart(2, "0")}</div>
            <a className="payment-open-gateway" href={url} target="_blank" rel="noopener noreferrer">Mở VNPay trên thiết bị này<ArrowSquareOut size={19} /></a>
          </> : <div className="booking-confirmation-loading" role="status"><SpinnerGap className="booking-confirmation-spinner" size={23} />Đang kiểm tra kết quả với hệ thống…</div>}
        {statusError ? <p className="booking-confirmation-error" role="alert">{statusError}</p> : null}
        {!paid ? <button className="payment-check-status" type="button" disabled={checking} onClick={refresh}>{checking ? "Đang kiểm tra…" : "Tôi đã thanh toán · Kiểm tra trạng thái"}</button> : null}
        {localSimulation && session ? <LocalIpnSimulation paymentId={checkout.paymentId} session={session} onCheck={refresh} /> : null}
        <p className="payment-security-note"><ShieldCheck size={17} />{localSimulation ? "GIẢ LẬP IPN LOCAL — không phải kết quả từ VNPay." : "Chuyến đi sẽ được xác nhận sau khi BonBon nhận được kết quả giao dịch."}</p>
      </> : null}
      <button className="payment-close" type="button" onClick={onClose}>{paid ? "Về chuyến của tôi" : "Đóng"}</button>
    </div>
  </BookingModalShell>;
}
