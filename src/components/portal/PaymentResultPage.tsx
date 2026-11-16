import { CheckCircle, Clock, SpinnerGap, WarningCircle } from "@phosphor-icons/react";
import { useAuth } from "../../auth/AuthContext";
import { usePaymentStatus } from "../../payment/usePaymentStatus";
import { paymentIdFromSearch, verifiedPaymentSucceeded } from "../../payment/payment-api";
import { formatBookingMoney as money } from "../../booking/booking-display";
import "../booking/payment.css";

export function PaymentResultPage() {
  const { session } = useAuth();
  const params = new URLSearchParams(window.location.search);
  const id = paymentIdFromSearch(window.location.search);
  const { status, error, checking, refresh } = usePaymentStatus(id, session, "SEPAY_SANDBOX");
  const paid = verifiedPaymentSucceeded(status);
  const failed = status && ["Failed", "Cancelled", "Refunded"].includes(status.status);
  return <><div className="portal-title-row"><h1>Kết quả thanh toán</h1></div><article className="portal-card payment-result-card">
    {!id ? <div className="payment-outcome"><WarningCircle size={56} /><h3>Không thể xác minh kết quả</h3><p>{params.get("returnError") === "unavailable" ? "Thanh toán trực tuyến hiện chưa khả dụng. Chưa có xác nhận thanh toán thành công." : "Đường dẫn thiếu mã giao dịch hợp lệ hoặc cổng thanh toán chưa sẵn sàng. Vui lòng kiểm tra đơn trong Chuyến của tôi."}</p></div>
      : paid ? <div className="payment-outcome payment-success"><CheckCircle size={64} weight="duotone" /><h3>Thanh toán thành công</h3><p>Đã ghi nhận {money(status!.amount)}. Bạn có thể xem tình trạng chuyến trong Chuyến của tôi.</p></div>
      : status?.requiresReconciliation ? <div className="payment-outcome"><WarningCircle size={56} /><h3>Giao dịch cần đối soát</h3><p>Không thanh toán lại khi chưa rõ kết quả. Vui lòng liên hệ quản trị viên.</p></div>
      : failed ? <div className="payment-outcome"><WarningCircle size={56} /><h3>Thanh toán chưa thành công</h3><p>Giao dịch thất bại hoặc đã bị hủy. Vui lòng xem lại đơn hàng.</p></div>
      : <div className="payment-outcome"><Clock size={56} /><h3>Đang xác minh thanh toán</h3><p>BonBon đang kiểm tra giao dịch. Vui lòng kiểm tra lại sau và không thanh toán thêm khi chưa rõ kết quả.</p></div>}
    {error ? <p className="booking-confirmation-error" role="alert">{error}</p> : null}
    {id && !paid ? <button className="payment-check-status" type="button" onClick={refresh} disabled={checking}>{checking ? <><SpinnerGap size={17} className="booking-confirmation-spinner" /> Đang kiểm tra…</> : "Kiểm tra lại kết quả"}</button> : null}
    <a className="payment-result-back" href="/my-trips">Về chuyến của tôi</a>
  </article></>;
}
