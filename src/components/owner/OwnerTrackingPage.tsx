import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowClockwise, CalendarBlank, CaretRight, MapTrifold, UserCircle } from "@phosphor-icons/react";
import { useAuth } from "../../auth/AuthContext";
import { bookingStatusLabel } from "../../booking/booking-status";
import { formatBookingDate, formatBookingMoney } from "../../booking/booking-display";
import { resolveBookingImage } from "../../portal/portal-api";
import { getOwnerBookings, type OwnerBooking } from "../../owner/owner-api";
import { trackingErrorMessage } from "../../tracking/tracking-api";
import { isMeetingPointsConfigurable } from "../../tracking/tracking-display";
import { EmptyState } from "../portal/EmptyState";
import { OwnerTrackingView } from "../tracking/OwnerTrackingView";
import "../portal/trips.css";
import "../tracking/tracking.css";

function trackingActionLabel(status: string) {
  if (status === "InProgress") return "Theo dõi trực tiếp";
  if (isMeetingPointsConfigurable(status)) return "Điểm trả xe";
  return "Chưa theo dõi được";
}

export function OwnerTrackingPage() {
  const { session } = useAuth();
  const [bookings, setBookings] = useState<OwnerBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get("bookingId"),
  );
  const requestRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setRefreshing(true);
    try {
      const items = await getOwnerBookings(session, controller.signal);
      if (controller.signal.aborted) return;
      setBookings(items);
      setError("");
    } catch (reason) {
      if (!controller.signal.aborted) setError(trackingErrorMessage(reason));
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [session]);

  useEffect(() => {
    void load();
    return () => requestRef.current?.abort();
  }, [load]);

  const selectBooking = useCallback((bookingId: string | null) => {
    setSelectedId(bookingId);
    const url = new URL(window.location.href);
    if (bookingId) url.searchParams.set("bookingId", bookingId);
    else url.searchParams.delete("bookingId");
    window.history.replaceState({}, "", `${url.pathname}${url.search}`);
  }, []);

  if (!session) return null;

  if (selectedId) {
    const booking = bookings.find((item) => item.bookingId === selectedId);
    if (booking) {
      return <OwnerTrackingView booking={booking} onBack={() => selectBooking(null)} />;
    }
    if (loading) return <div className="portal-loading">Đang tải chuyến cho thuê…</div>;
    return (
      <article className="portal-card tracking-gate">
        <span className="tracking-gate-icon"><MapTrifold size={26} /></span>
        <div>
          <h2>Không tìm thấy chuyến</h2>
          <p>Chuyến này không thuộc tài khoản của bạn hoặc đã bị xoá khỏi danh sách cho thuê.</p>
        </div>
        <button className="owner-secondary-button" type="button" onClick={() => selectBooking(null)}>
          Về danh sách
        </button>
      </article>
    );
  }

  const trackable = bookings.filter((item) => isMeetingPointsConfigurable(item.status));

  return (
    <>
      <div className="portal-title-row">
        <div>
          <h1>Chuyến cho thuê</h1>
          <p>Theo dõi vị trí xe trong lúc khách đang thuê và đặt điểm trả xe cho từng chuyến.</p>
        </div>
        <button className="trip-refresh" type="button" disabled={refreshing} onClick={() => void load()}>
          <ArrowClockwise size={18} />
          {refreshing ? "Đang cập nhật…" : "Cập nhật"}
        </button>
      </div>

      {error ? (
        <p className="booking-confirmation-error" role="alert">
          {error} <button type="button" onClick={() => void load()}>Thử lại</button>
        </p>
      ) : null}

      <article className="portal-card">
        {loading ? (
          <div className="portal-loading">Đang tải chuyến cho thuê…</div>
        ) : bookings.length === 0 ? (
          <EmptyState
            image="/assets/portal/empty-trips.webp"
            title="Bạn chưa có chuyến cho thuê"
            description="Khi khách đặt xe của bạn, chuyến sẽ xuất hiện tại đây kèm bản đồ theo dõi."
            action={<a className="button portal-primary" href="/become-owner">Đăng ký cho thuê xe</a>}
          />
        ) : (
          <>
            <p className="tracking-list-note">
              {trackable.length > 0
                ? `${trackable.length} chuyến có thể theo dõi hoặc thiết lập điểm trả xe.`
                : "Chưa có chuyến nào đang thuê. Tracking tự mở khi bạn bàn giao xe cho khách."}
            </p>
            <div className="trip-list">
              {bookings.map((booking) => {
                const enabled = isMeetingPointsConfigurable(booking.status);
                return (
                  <article className="trip-item" key={booking.bookingId}>
                    <button
                      className="trip-image-button"
                      type="button"
                      aria-label={`Mở tracking ${booking.vehicleName}`}
                      onClick={() => selectBooking(booking.bookingId)}
                    >
                      {booking.coverImageUrl
                        ? <img src={resolveBookingImage(booking.coverImageUrl) ?? ""} alt={booking.vehicleName} />
                        : <span className="trip-image-placeholder">BonBon</span>}
                    </button>

                    <div className="trip-main">
                      <div className="trip-top">
                        <h3>
                          <button type="button" onClick={() => selectBooking(booking.bookingId)}>
                            {booking.vehicleName}
                          </button>
                        </h3>
                        <span className={`booking-status status-${booking.status.toLowerCase()}`}>
                          {bookingStatusLabel(booking.status)}
                        </span>
                      </div>
                      <p className="plate">{booking.plateNumber}</p>
                      <p><UserCircle size={17} />{booking.customerName}{booking.customerPhone ? ` · ${booking.customerPhone}` : ""}</p>
                      <p><CalendarBlank size={17} />{formatBookingDate(booking.startAt)}</p>
                      <p className="trip-end">đến {formatBookingDate(booking.endAt)}</p>
                    </div>

                    <div className="trip-actions">
                      <strong className="trip-price">{formatBookingMoney(booking.totalAmount)}</strong>
                      <button
                        className={enabled ? "trip-pay" : "trip-pay is-muted"}
                        type="button"
                        disabled={!enabled}
                        onClick={() => selectBooking(booking.bookingId)}
                      >
                        <MapTrifold size={18} />
                        {trackingActionLabel(booking.status)}
                      </button>
                      <button className="trip-view-detail" type="button" onClick={() => selectBooking(booking.bookingId)}>
                        Xem bản đồ<CaretRight size={15} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </article>
    </>
  );
}
