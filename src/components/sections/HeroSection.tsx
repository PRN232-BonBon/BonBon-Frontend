import { FormEvent, useState } from "react";
import { CalendarBlank, MagnifyingGlass, MapPin, SteeringWheel } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import {
  createDefaultRentalSelection,
  formatRentalSummary,
  RentalTimeModal,
  type RentalSelection,
} from "../booking/RentalTimeModal";

export function HeroSection() {
  const reduceMotion = useReducedMotion();
  const [location, setLocation] = useState("TP. Hồ Chí Minh");
  const [rentalWindow, setRentalWindow] = useState<RentalSelection>(createDefaultRentalSelection);
  const [isTimeOpen, setIsTimeOpen] = useState(false);
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(`Đang tìm xe tại ${location}...`);
    const params = new URLSearchParams({
      location,
      rentalType: rentalWindow.rentalType,
      startAt: rentalWindow.startAt,
      endAt: rentalWindow.endAt,
    });
    window.location.href = `/cars?${params.toString()}`;
  }

  return (
    <main id="top" className="hero-section">
      <div className="container">
        <div className="hero-media">
          <img src="/assets/hero/hero.webp" alt="Xe BonBon bên khu cắm trại trong ánh hoàng hôn" />
          <div className="hero-overlay" />
          <motion.div
            className="hero-copy"
            initial={reduceMotion ? false : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1>BonBon - Cùng Bạn<br />Trên Mọi Hành Trình</h1>
            <div className="hero-rule" />
            <p>Khám phá những chiếc xe phù hợp để chủ động trên mọi hành trình.</p>
          </motion.div>
        </div>

        <motion.div
          className="search-shell"
          initial={reduceMotion ? false : { opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.32, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="service-tabs" aria-label="Loại dịch vụ">
            <button className="service-tab active" type="button"><SteeringWheel size={21} weight="bold" /> Xe tự lái</button>
          </div>
          <form className="search-panel" onSubmit={handleSubmit}>
          <label className="search-field location-field">
            <MapPin size={22} weight="bold" />
            <span>
              <small>Địa điểm</small>
              <select value={location} onChange={(event) => setLocation(event.target.value)}>
                <option>TP. Hồ Chí Minh</option>
                <option>Hà Nội</option>
                <option>Đà Nẵng</option>
                <option>Bình Dương</option>
                <option>Đà Lạt</option>
                <option>Hạ Long</option>
              </select>
            </span>
          </label>

          <button className="search-field rental-search-field" type="button" onClick={() => setIsTimeOpen(true)}>
            <CalendarBlank size={22} weight="bold" />
            <span>
              <small>Thời gian thuê</small>
              <strong>{formatRentalSummary(rentalWindow)}</strong>
              <em>{rentalWindow.rentalType === "Hourly" ? "Thuê giờ" : "Thuê ngày"} · {rentalWindow.billableUnits} {rentalWindow.unitLabel}</em>
            </span>
          </button>

          <button className="button button-primary search-button" type="submit">
            <MagnifyingGlass size={20} weight="bold" />
            Tìm xe
          </button>
            <p className="search-message" role="status">{message}</p>
          </form>
          {isTimeOpen ? (
            <RentalTimeModal
              value={rentalWindow}
              onClose={() => setIsTimeOpen(false)}
              onConfirm={(selection) => {
                setRentalWindow(selection);
                setIsTimeOpen(false);
                setMessage("");
              }}
            />
          ) : null}
        </motion.div>
      </div>
    </main>
  );
}
