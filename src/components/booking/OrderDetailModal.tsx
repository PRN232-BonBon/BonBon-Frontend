import { useEffect, useState } from "react";
import { CalendarBlank, CaretRight, IdentificationCard, Info, MapPin, MapTrifold, ShieldCheck, SpinnerGap, SteeringWheel, Tag, UserCircle } from "@phosphor-icons/react";
import { useAuth } from "../../auth/AuthContext";
import { getBookingDetail, type BookingDetail } from "../../portal/portal-api";
import { bookingStatusLabel, canPayBooking, isPaidBooking } from "../../booking/booking-status";
import { formatBookingDate, formatBookingMoney as money } from "../../booking/booking-display";
import { paymentErrorMessage } from "../../payment/payment-api";
import { BookingModalShell } from "./BookingModalShell";
import "./payment.css";

export function OrderDetailModal({ bookingId, onClose, onPayment }: { bookingId: string; onClose: () => void; onPayment: () => void }) {
  const { session } = useAuth();
  const [detail, setDetail] = useState<BookingDetail | null>(null);
  const [error, setError] = useState(""); const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    setDetail(null); setError("");
    getBookingDetail(bookingId, session, controller.signal).then(value => {
      if (!controller.signal.aborted) setDetail(value);
    }).catch(reason => {
      if (!controller.signal.aborted) setError(paymentErrorMessage(reason));
    });
    return () => controller.abort();
  }, [bookingId, session, attempt]);
  const unit = detail?.rentalType === "Hourly" ? "giờ" : "ngày";
  return <BookingModalShell title="Chi tiết đơn hàng" onClose={onClose}>
    {!detail && !error ? <div className="booking-confirmation-loading" role="status"><SpinnerGap className="booking-confirmation-spinner" size={24} />Đang tải đơn hàng…</div> : null}
    {error ? <div className="booking-confirmation-error" role="alert"><p>{error}</p><button type="button" onClick={() => setAttempt(value => value + 1)}>Thử lại</button></div> : null}
    {detail ? <>
      <section className="booking-confirmation-vehicle">
        <img className="booking-confirmation-cover" src={detail.vehicle.coverImageUrl || "/not-found.webp"} alt={`${detail.vehicle.brand} ${detail.vehicle.model}`} />
        <div><h3>{detail.vehicle.brand} {detail.vehicle.model}</h3>
          <p className="booking-confirmation-specs"><SteeringWheel size={17} />{detail.vehicle.transmission === "Automatic" ? "Số tự động" : "Số sàn"}<span>· {detail.vehicle.seats} chỗ</span></p>
          <p className="booking-confirmation-address"><MapPin size={17} />{detail.vehicle.pickupAddress}</p>
          <div className="booking-confirmation-notice"><ShieldCheck size={27} /><div><strong>{bookingStatusLabel(detail.status)}</strong><p>{detail.status === "PendingApproval" ? "Chủ xe chưa duyệt yêu cầu. Bạn chưa thể thanh toán." : isPaidBooking(detail.status) ? "Thanh toán đã được hệ thống ghi nhận." : detail.status === "AwaitingPayment" ? "Chủ xe đã duyệt. Bạn có thể thanh toán để xác nhận chuyến." : "Bạn có thể xem lại thông tin của đơn hàng này."}</p></div></div>
        </div>
      </section>
      <p className="order-reference">Mã đơn hàng: <strong>{detail.bookingId}</strong></p>
      <section className="booking-confirmation-section"><h3>Thời gian thuê xe</h3><div className="booking-confirmation-dates">
        <div><CalendarBlank size={23} /><div><span>Bắt đầu thuê xe</span><strong>{formatBookingDate(detail.startAt)}</strong><small>Thuê {unit} · {detail.billableUnits} {unit}</small></div></div>
        <div><CalendarBlank size={23} /><div><span>Kết thúc thuê xe</span><strong>{formatBookingDate(detail.endAt)}</strong></div></div>
      </div></section>
      <section className="booking-confirmation-section"><h3>Địa chỉ giao nhận xe</h3><p className="booking-confirmation-pickup">{detail.vehicle.pickupAddress}</p>
        <a className="booking-confirmation-map" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detail.vehicle.pickupAddress)}`} target="_blank" rel="noopener noreferrer"><MapTrifold size={19} />Xem bản đồ<CaretRight size={16} /></a>
      </section>
      <section className="booking-confirmation-section booking-confirmation-owner"><div className="booking-confirmation-owner-profile"><UserCircle size={76} weight="thin" /><div><span>Chủ xe</span><h3>{detail.owner.fullName}</h3><p>Nhận xe trực tiếp tại địa chỉ của chủ xe</p></div></div></section>
      <section className="booking-confirmation-section"><h3>Giấy tờ thuê xe</h3><p className="booking-confirmation-document"><IdentificationCard size={25} />GPLX phù hợp và CCCD hoặc Passport để đối chiếu khi nhận xe.</p></section>
      {detail.rentalTerms ? <section className="booking-confirmation-section"><h3>Điều khoản thuê xe</h3><p className="booking-confirmation-terms">{detail.rentalTerms}</p></section> : null}
      {detail.includedMileageKm != null ? <section className="booking-confirmation-mileage"><Info size={21} /><p>Giới hạn quãng đường: <strong>{detail.includedMileageKm.toLocaleString("vi-VN")} km/chuyến</strong>.{detail.overageFeePerKm != null ? <> Phí vượt giới hạn: <strong>{money(detail.overageFeePerKm)}/km</strong>.</> : null}</p></section> : null}
      <section className="booking-confirmation-section booking-confirmation-pricing"><h3>Bảng tính giá</h3><dl className="booking-confirmation-price-list">
        <div><dt>Đơn giá thuê</dt><dd>{money(detail.unitPrice)}/{unit}</dd></div>
        <div><dt>Tổng cộng</dt><dd>{money(detail.baseRentalAmount)}<small> · {detail.billableUnits} {unit}</small></dd></div>
        {detail.discountAmount > 0 ? <div className="booking-confirmation-discount"><dt><span><Tag size={18} />Chương trình giảm giá</span><small>Giảm {detail.weeklyDiscountPercent}% khi thuê từ 7 ngày</small></dt><dd>-{money(detail.discountAmount)}</dd></div> : null}
        <div className="booking-confirmation-total"><dt>Thành tiền</dt><dd>{money(detail.quotedRentalAmount)}</dd></div>
      </dl><p className="booking-confirmation-muted order-price-note">Giá và điều khoản đã lưu lúc đặt xe, không tính lại theo giá xe hiện tại.</p></section>
      <footer className="booking-confirmation-actions"><button type="button" className="booking-confirmation-cancel" onClick={onClose}>Đóng</button><button type="button" className="booking-confirmation-submit" disabled={!canPayBooking(detail)} onClick={onPayment}>{isPaidBooking(detail.status) ? "Đã thanh toán" : "Thanh toán"}</button></footer>
      {detail.status === "PendingApproval" ? <p className="order-payment-hint">Đơn đặt cũ đang chờ xử lý. Vui lòng liên hệ BonBon để được hỗ trợ.</p> : null}
    </> : null}
  </BookingModalShell>;
}
