import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  CalendarBlank,
  Camera,
  CarProfile,
  Check,
  CheckCircle,
  GasPump,
  Heart,
  MapPin,
  Seat,
  ShieldCheck,
  Star,
  SteeringWheel,
  UserCircle,
  X,
} from "@phosphor-icons/react";
import { useAuth } from "../../auth/AuthContext";
import { createBooking } from "../../booking/booking-api";
import type { VehicleListing } from "../../data/demo-vehicles";
import { formatRentalSummary, RentalTimeModal, type RentalSelection } from "../booking/RentalTimeModal";

interface CarDetailModalProps {
  vehicle: VehicleListing;
  initialRentalWindow: RentalSelection;
  onClose: () => void;
}

const money = new Intl.NumberFormat("vi-VN");

export function CarDetailModal({ vehicle, initialRentalWindow, onClose }: CarDetailModalProps) {
  const { session } = useAuth();
  const [rentalWindow, setRentalWindow] = useState(initialRentalWindow);
  const [isTimeOpen, setIsTimeOpen] = useState(false);
  const [activeImage, setActiveImage] = useState(vehicle.imageUrls[0]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const unitPrice = rentalWindow.rentalType === "Hourly" ? vehicle.hourPrice : vehicle.dayPrice;
  const total = unitPrice * rentalWindow.billableUnits;
  const rentalLabel = rentalWindow.rentalType === "Hourly" ? "giờ" : "ngày";

  const specificationItems = useMemo(() => [
    { icon: SteeringWheel, label: "Truyền động", value: vehicle.transmission === "Automatic" ? "Số tự động" : "Số sàn" },
    { icon: Seat, label: "Số ghế", value: `${vehicle.seats} chỗ` },
    { icon: GasPump, label: "Nhiên liệu", value: vehicle.fuel === "Electric" ? "Điện" : "Xăng" },
    { icon: CarProfile, label: "Dòng xe", value: vehicle.bodyType },
  ], [vehicle]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isTimeOpen) onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isTimeOpen, onClose]);

  const submitBooking = async () => {
    setMessage(null);
    if (!session) {
      onClose();
      window.dispatchEvent(new CustomEvent("bonbon:open-auth", { detail: "login" }));
      return;
    }

    setIsSubmitting(true);
    try {
      await createBooking(vehicle.id, {
        rentalType: rentalWindow.rentalType,
        startAt: rentalWindow.startAt,
        endAt: rentalWindow.endAt,
      }, session.accessToken);
      window.location.href = "/my-trips";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể tạo chuyến thuê xe.");
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="car-detail-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <article className="car-detail-modal" role="dialog" aria-modal="true" aria-labelledby="car-detail-title">
        <header className="car-detail-header">
          <div>
            <span>Chi tiết xe</span>
            <strong>{vehicle.brand} {vehicle.model} {vehicle.year}</strong>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng chi tiết xe"><X size={21} weight="bold" /></button>
        </header>

        <div className="car-detail-scroll">
          <section className="car-gallery" aria-label="Ảnh xe">
            <button className="car-gallery-main" type="button" onClick={() => setActiveImage(vehicle.imageUrls[0])}>
              <img src={activeImage} alt={`${vehicle.brand} ${vehicle.model} ${vehicle.year}`} />
            </button>
            <div className="car-gallery-thumbnails">
              {vehicle.imageUrls.slice(0, 3).map((image, index) => (
                <button className={activeImage === image ? "is-active" : ""} type="button" key={image} onClick={() => setActiveImage(image)} aria-label={`Xem ảnh xe ${index + 1}`}>
                  <img src={image} alt="" />
                </button>
              ))}
              <span><Camera size={18} /> {vehicle.imageUrls.length} ảnh</span>
            </div>
          </section>

          <div className="car-detail-layout">
            <div className="car-detail-content">
              <section className="car-title-section">
                <div>
                  <h1 id="car-detail-title">{vehicle.brand} {vehicle.model} {vehicle.year}</h1>
                  <p><Star weight="fill" /> {vehicle.rating.toFixed(1)} <span>•</span> {vehicle.completedTrips} chuyến <span>•</span> {vehicle.pickupAddress}</p>
                </div>
                <button className={isFavorite ? "is-active" : ""} type="button" onClick={() => setIsFavorite((value) => !value)} aria-label={isFavorite ? "Bỏ yêu thích" : "Thêm vào yêu thích"}><Heart size={23} weight={isFavorite ? "fill" : "bold"} /></button>
              </section>

              <div className="car-detail-badges">
                {vehicle.depositFree ? <span><CheckCircle weight="fill" /> Miễn thế chấp</span> : null}
                {vehicle.deliveryAvailable ? <span><MapPin weight="fill" /> Giao xe tận nơi</span> : null}
              </div>

              <section className="car-detail-section">
                <h2>Đặc điểm</h2>
                <div className="car-specification-grid">
                  {specificationItems.map(({ icon: Icon, label, value }) => <div key={label}><Icon size={25} /><span>{label}<strong>{value}</strong></span></div>)}
                </div>
              </section>

              <section className="car-detail-section">
                <h2>Mô tả</h2>
                <p className="car-description">{vehicle.description}</p>
              </section>

              <section className="car-detail-section">
                <h2>Tiện nghi</h2>
                <div className="car-feature-grid">
                  {vehicle.features.map((feature) => <span key={feature}><Check size={17} weight="bold" /> {feature}</span>)}
                </div>
              </section>

              <section className="car-detail-section car-rules-section">
                <h2>Quy định thuê xe</h2>
                <div className="car-rule-groups">
                  <div><ShieldCheck size={25} /><span><strong>Giấy tờ cần có</strong><small>GPLX phù hợp và CCCD hoặc Passport.</small></span></div>
                  <div><CheckCircle size={25} /><span><strong>Quy định sử dụng</strong><small>Trả xe đúng giờ, đúng tình trạng và không dùng xe sai mục đích.</small></span></div>
                </div>
              </section>

              <section className="car-owner-section">
                <UserCircle size={54} weight="duotone" />
                <div><span>Chủ xe</span><strong>BonBon Demo Fleet</strong><small><Star weight="fill" /> 5.0 · Phản hồi nhanh</small></div>
              </section>
            </div>

            <aside className="car-booking-card">
              <div className="car-booking-price"><strong>{money.format(unitPrice)}đ</strong><span>/{rentalLabel}</span></div>
              <button className="car-booking-time" type="button" onClick={() => setIsTimeOpen(true)}>
                <CalendarBlank size={22} />
                <span>Thời gian thuê<strong>{formatRentalSummary(rentalWindow)}</strong></span>
              </button>
              <div className="car-booking-location"><MapPin size={22} /><span>Địa điểm nhận xe<strong>{vehicle.pickupAddress}</strong></span></div>
              <div className="car-booking-summary">
                <div><span>Đơn giá thuê</span><strong>{money.format(unitPrice)}đ/{rentalLabel}</strong></div>
                <div><span>Thời lượng</span><strong>{rentalWindow.billableUnits} {rentalLabel}</strong></div>
                <div className="car-booking-total"><span>Tổng cộng</span><strong>{money.format(total)}đ</strong></div>
              </div>
              {message ? <p className="car-booking-message" role="alert">{message}</p> : null}
              <button className="car-booking-submit" type="button" disabled={isSubmitting} onClick={() => void submitBooking()}>{isSubmitting ? "Đang tạo chuyến..." : "Đặt xe"}</button>
              <small>Bạn chưa bị tính phí ở bước này.</small>
            </aside>
          </div>
        </div>
      </article>

      {isTimeOpen ? <RentalTimeModal value={rentalWindow} onClose={() => setIsTimeOpen(false)} onConfirm={(selection) => { setRentalWindow(selection); setIsTimeOpen(false); }} /> : null}
    </div>,
    document.body,
  );
}
