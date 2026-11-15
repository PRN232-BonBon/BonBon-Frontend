import { useEffect, useId, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { CalendarBlank, CaretRight, CheckCircle, IdentificationCard, Info, MapPin, MapTrifold, ShieldCheck, SpinnerGap, Star, SteeringWheel, Tag, UserCircle, X } from "@phosphor-icons/react";
import type { VehicleListing } from "../../data/demo-vehicles";
import { getBookingQuote, type BookingQuote } from "../../booking/booking-api";
import { formatBookingDate, formatBookingMoney as money } from "../../booking/booking-display";
import type { RentalSelection } from "./RentalTimeModal";
import "./BookingConfirmationModal.css";

interface Props {
  vehicle: VehicleListing;
  rentalWindow: RentalSelection;
  isSubmitting: boolean;
  isAuthenticated: boolean;
  submissionError: string | null;
  onClose: () => void;
  onSubmit: (quote: BookingQuote) => Promise<void>;
}

type QuoteState = { kind: "loading" } | { kind: "error"; message: string } | { kind: "ready"; quote: BookingQuote };

export function BookingConfirmationModal({ vehicle, rentalWindow, isSubmitting, isAuthenticated, submissionError, onClose, onSubmit }: Props) {
  const titleId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const [quoteState, setQuoteState] = useState<QuoteState>({ kind: "loading" });
  const [quoteAttempt, setQuoteAttempt] = useState(0);
  const reduceMotion = useReducedMotion();
  const { rentalType, startAt, endAt } = rentalWindow;
  const quote = quoteState.kind === "ready" ? quoteState.quote : null;
  const unit = rentalType === "Hourly" ? "giờ" : "ngày";
  const vehicleName = `${vehicle.brand} ${vehicle.model} ${vehicle.year ?? ""}`.trim();

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    let active = true;
    setQuoteState({ kind: "loading" });
    getBookingQuote(vehicle.id, { rentalType, startAt, endAt }, controller.signal)
      .then(value => { if (active) setQuoteState({ kind: "ready", quote: value }); })
      .catch((error: unknown) => {
        if (active) setQuoteState({ kind: "error", message: controller.signal.aborted
          ? "Tải báo giá quá lâu. Vui lòng thử lại."
          : error instanceof TypeError ? "Không thể kết nối đến BonBon. Vui lòng thử lại."
          : error instanceof Error ? error.message : "Không thể tải báo giá. Vui lòng thử lại." });
      }).finally(() => window.clearTimeout(timeout));
    return () => { active = false; window.clearTimeout(timeout); controller.abort(); };
  }, [vehicle.id, rentalType, startAt, endAt, quoteAttempt]);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const dialog = dialogRef.current;
    dialog?.focus({ preventScroll: true });
    return () => {
      // Do not steal focus from a login dialog opened above this one.
      if ((dialog?.contains(document.activeElement) || document.activeElement === document.body)
        && previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!isSubmitting) onClose();
      }
      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      const controls = dialog?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], [tabindex="0"]');
      if (!dialog || !controls?.length) { event.preventDefault(); return; }
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog || !dialog.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isSubmitting, onClose]);

  return (
    <motion.div className="booking-confirmation-overlay" role="presentation"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : .18 }}
      onMouseDown={event => { if (event.target === event.currentTarget && !isSubmitting) onClose(); }}>
      <motion.article ref={dialogRef} className="booking-confirmation-modal" role="dialog" aria-modal="true"
        aria-labelledby={titleId} tabIndex={-1}
        initial={reduceMotion ? false : { opacity: 0, y: 24, scale: .985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }} exit={reduceMotion ? undefined : { opacity: 0, y: 16, scale: .99 }}
        transition={{ duration: reduceMotion ? 0 : .24, ease: [.16, 1, .3, 1] }}>
        <header className="booking-confirmation-header">
          <h2 id={titleId}>Xác nhận đặt xe</h2>
          <button type="button" aria-label="Đóng xác nhận đặt xe" onClick={onClose} disabled={isSubmitting}><X size={16} weight="bold" /></button>
        </header>

        <div className="booking-confirmation-scroll">
          <section className="booking-confirmation-vehicle" aria-label="Xe đã chọn">
            <img className="booking-confirmation-cover" src={vehicle.imageUrl} alt={vehicleName} />
            <div>
              <h3>{vehicleName}</h3>
              <p className="booking-confirmation-specs">
                {vehicle.rating > 0 ? <><span className="booking-confirmation-rating"><Star size={17} weight="fill" />{vehicle.rating.toFixed(1)}</span><span className="booking-confirmation-dot">•</span></> : null}
                {vehicle.completedTrips > 0 ? <><span>{vehicle.completedTrips} chuyến</span><span className="booking-confirmation-dot">•</span></> : null}
                <span><SteeringWheel size={17} />{vehicle.transmission === "Automatic" ? "Số tự động" : "Số sàn"}</span>
              </p>
              <p className="booking-confirmation-address"><MapPin size={17} weight="fill" />{vehicle.pickupAddress}</p>
              <div className="booking-confirmation-notice">
                <ShieldCheck size={27} /><div><strong>Đặt xe qua BonBon</strong><p>Xe được giữ tạm trong tối đa 15 phút để bạn thanh toán.</p></div>
              </div>
            </div>
          </section>

          <section className="booking-confirmation-section">
            <h3>Thời gian thuê xe</h3>
            <div className="booking-confirmation-dates">
              <div><CalendarBlank size={23} /><div><span>Bắt đầu thuê xe</span><strong>{formatBookingDate(startAt)}</strong><small>Thuê {unit} · {rentalWindow.billableUnits} {unit}</small></div></div>
              <div><CalendarBlank size={23} /><div><span>Kết thúc thuê xe</span><strong>{formatBookingDate(endAt)}</strong></div></div>
            </div>
          </section>

          <section className="booking-confirmation-section">
            <h3>Địa chỉ giao nhận xe</h3>
            <p className="booking-confirmation-pickup">{vehicle.pickupAddress}</p>
            <a className="booking-confirmation-map" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(vehicle.pickupAddress)}`} target="_blank" rel="noopener noreferrer"><MapTrifold size={19} />Xem bản đồ<CaretRight size={16} /></a>
          </section>

          <section className="booking-confirmation-section booking-confirmation-owner" aria-label="Chủ xe">
            <div className="booking-confirmation-owner-profile"><UserCircle size={76} weight="thin" /><div><span>Chủ xe</span><h3>{vehicle.owner?.fullName || "Chủ xe BonBon"}</h3><p>Nhận xe trực tiếp tại địa chỉ của chủ xe</p></div></div>
            <p className="booking-confirmation-muted">Sau khi đặt xe, bạn có thể thanh toán và theo dõi chuyến đi tại Chuyến của tôi.</p>
          </section>

          <section className="booking-confirmation-section">
            <h3>Giấy tờ thuê xe</h3>
            <p className="booking-confirmation-document"><IdentificationCard size={25} /><span>GPLX phù hợp và CCCD hoặc Passport để đối chiếu khi nhận xe.</span></p>
          </section>

          {vehicle.depositFree ? <section className="booking-confirmation-section"><h3>Tài sản thế chấp</h3><p className="booking-confirmation-muted">Không yêu cầu khách thuê thế chấp Tiền mặt hoặc Xe máy.</p></section> : null}

          {quote?.rentalTerms ? <section className="booking-confirmation-section"><h3>Điều khoản thuê xe</h3><p className="booking-confirmation-terms">{quote.rentalTerms}</p></section> : null}
          {quote?.includedMileageKm != null ? <section className="booking-confirmation-mileage"><Info size={21} /><p>Giới hạn quãng đường: <strong>{new Intl.NumberFormat("vi-VN").format(quote.includedMileageKm)} km/chuyến</strong>.{quote.overageFeePerKm != null ? <> Phí vượt giới hạn: <strong>{money(quote.overageFeePerKm)}/km</strong>.</> : null}</p></section> : null}

          <section className="booking-confirmation-section booking-confirmation-pricing" aria-label="Bảng tính giá" aria-busy={quoteState.kind === "loading"}>
            <h3>Bảng tính giá</h3>
            {quoteState.kind === "loading" ? <div className="booking-confirmation-loading" role="status"><SpinnerGap className="booking-confirmation-spinner" size={22} />Đang kiểm tra giá và lịch trống…</div> : null}
            {quoteState.kind === "error" ? <div className="booking-confirmation-error" role="alert"><p>{quoteState.message}</p><button type="button" onClick={() => setQuoteAttempt(attempt => attempt + 1)}>Thử lại báo giá</button></div> : null}
            {quote ? <>
              <dl className="booking-confirmation-price-list">
                <div><dt>Đơn giá thuê</dt><dd>{money(quote.unitPrice)}/{unit}</dd></div>
                <div><dt>Tổng cộng</dt><dd>{money(quote.unitPrice)} × {quote.billableUnits} {unit}</dd></div>
                {quote.discountAmount > 0 ? <div className="booking-confirmation-discount"><dt><span><Tag size={18} />Chương trình giảm giá</span><small>Giảm {quote.weeklyDiscountPercent}% khi thuê từ 7 ngày</small></dt><dd>-{money(quote.discountAmount)}</dd></div> : null}
                <div className="booking-confirmation-total"><dt>Thành tiền</dt><dd>{money(quote.quotedRentalAmount)}</dd></div>
              </dl>
              {!quote.isAvailable ? <p className="booking-confirmation-error" role="alert">Xe đã có lịch trong thời gian này. Vui lòng quay lại và chọn thời gian khác.</p> : <p className="booking-confirmation-payment-note"><CheckCircle size={18} />Bạn sẽ được chuyển sang thanh toán sau khi đặt xe.</p>}
            </> : null}
          </section>

          {submissionError ? <p className="booking-confirmation-error" role="alert">{submissionError}</p> : null}
          <footer className="booking-confirmation-actions">
            <button className="booking-confirmation-cancel" type="button" onClick={onClose} disabled={isSubmitting}>Hủy</button>
            <button className="booking-confirmation-submit" type="button" disabled={!quote?.isAvailable || isSubmitting}
              onClick={() => { if (quote?.isAvailable && !isSubmitting) void onSubmit(quote); }}>
              {isSubmitting ? <><SpinnerGap className="booking-confirmation-spinner" size={20} />Đang giữ xe…</> : isAuthenticated ? "Đặt xe và thanh toán" : "Đăng nhập để đặt xe"}
            </button>
          </footer>
        </div>
      </motion.article>
    </motion.div>
  );
}
