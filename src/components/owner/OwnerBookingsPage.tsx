import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowClockwise } from "@phosphor-icons/react";
import { useAuth } from "../../auth/AuthContext";
import { bookingStatusLabel } from "../../booking/booking-status";
import { formatBookingDate, formatBookingMoney } from "../../booking/booking-display";
import { getOwnerBookings, type OwnerBooking } from "../../owner/owner-api";
import "./owner-bookings.css";

export function OwnerBookingsPage() {
  const { session } = useAuth();
  const [items, setItems] = useState<OwnerBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const requestRef = useRef<AbortController | null>(null);
  const selectedId = new URLSearchParams(window.location.search).get("bookingId");

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!session) { setLoading(false); return; }
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    const requestSignal = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
    setRefreshing(true);
    try {
      const bookings = await getOwnerBookings(session, requestSignal);
      if (!requestSignal.aborted) { setItems(bookings); setError(""); }
    } catch (reason) {
      if (!requestSignal.aborted) setError(reason instanceof Error ? reason.message : "Không thể tải yêu cầu thuê xe.");
    } finally {
      if (!requestSignal.aborted) { setLoading(false); setRefreshing(false); }
    }
  }, [session]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => { controller.abort(); requestRef.current?.abort(); };
  }, [load]);

  useEffect(() => {
    if (selectedId && !loading) document.getElementById(`owner-booking-${selectedId}`)?.scrollIntoView({ block: "center" });
  }, [selectedId, loading]);

  return <>
    <div className="portal-title-row owner-bookings-heading">
      <div><h1>Đơn thuê xe</h1><p>Theo dõi các đơn thuê xe của khách.</p></div>
      <button className="trip-refresh" type="button" disabled={refreshing} onClick={() => void load()}><ArrowClockwise size={18} />{refreshing ? "Đang cập nhật…" : "Cập nhật"}</button>
    </div>
    {error ? <p className="booking-confirmation-error" role="alert">{error} <button type="button" onClick={() => void load()}>Thử lại</button></p> : null}
    <article className="portal-card owner-bookings-card">
      {loading ? <div className="portal-loading" role="status">Đang tải yêu cầu…</div>
        : items.length === 0 ? <div className="owner-bookings-empty"><strong>Chưa có yêu cầu thuê xe</strong><p>Khi khách đặt xe của bạn, yêu cầu sẽ xuất hiện tại đây.</p></div>
        : <div className="owner-booking-list">{items.map(item => <article className={`owner-booking-item${selectedId === item.bookingId ? " is-selected" : ""}`} id={`owner-booking-${item.bookingId}`} key={item.bookingId}>
          {item.coverImageUrl ? <img className="owner-booking-image" src={item.coverImageUrl} alt={item.vehicleName} /> : <div className="owner-booking-image owner-booking-placeholder">BonBon</div>}
          <div className="owner-booking-details">
            <div className="owner-booking-title"><h2>{item.vehicleName}</h2><span className={`booking-status status-${item.status.toLowerCase()}`}>{bookingStatusLabel(item.status)}</span></div>
            <p className="owner-booking-plate">{item.plateNumber}</p>
            <p><strong>Khách thuê:</strong> {item.customerName}{item.customerPhone ? ` · ${item.customerPhone}` : ""}</p>
            <p><strong>Thời gian:</strong> {formatBookingDate(item.startAt)} – {formatBookingDate(item.endAt)}</p>
            <p><strong>Hình thức:</strong> {item.rentalType === "Hourly" ? "Thuê theo giờ" : "Thuê theo ngày"}</p>
          </div>
          <div className="owner-booking-actions">
            <strong>{formatBookingMoney(item.totalAmount)}</strong>
          </div>
        </article>)}</div>}
    </article>
  </>;
}
