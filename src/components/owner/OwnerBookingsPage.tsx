import { useCallback, useEffect, useState } from "react";
import { ArrowClockwise, Check, X } from "@phosphor-icons/react";
import { useAuth } from "../../auth/AuthContext";
import { bookingStatusLabel } from "../../booking/booking-status";
import { formatBookingDate, formatBookingMoney } from "../../booking/booking-display";
import { approveBooking, getOwnerBookings, rejectBooking, type OwnerBooking } from "../../owner/owner-api";
import "./owner-bookings.css";

export function OwnerBookingsPage() {
  const { session } = useAuth();
  const [items, setItems] = useState<OwnerBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!session) { setLoading(false); return; }
    setRefreshing(true);
    try {
      const bookings = await getOwnerBookings(session, signal);
      if (!signal?.aborted) { setItems(bookings); setError(""); }
    } catch (reason) {
      if (!signal?.aborted) setError(reason instanceof Error ? reason.message : "Không thể tải yêu cầu thuê xe.");
    } finally {
      if (!signal?.aborted) { setLoading(false); setRefreshing(false); }
    }
  }, [session]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const decide = async (item: OwnerBooking, decision: "approve" | "reject") => {
    if (!session || busyId) return;
    const action = decision === "approve" ? "duyệt" : "từ chối";
    if (decision === "reject" && !window.confirm(`Bạn có chắc muốn từ chối yêu cầu thuê ${item.vehicleName}?`)) return;
    setBusyId(item.bookingId); setError(""); setNotice("");
    try {
      const result = decision === "approve"
        ? await approveBooking(session, item.bookingId)
        : await rejectBooking(session, item.bookingId);
      setNotice(result.isReplay ? `Yêu cầu này đã được ${action} trước đó.` : `Đã ${action} yêu cầu thuê xe.`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : `Không thể ${action} yêu cầu thuê xe.`);
    } finally { setBusyId(""); }
  };

  return <>
    <div className="portal-title-row owner-bookings-heading">
      <div><h1>Yêu cầu thuê xe</h1><p>Xem và phản hồi các yêu cầu đặt xe của khách.</p></div>
      <button className="trip-refresh" type="button" disabled={refreshing} onClick={() => void load()}><ArrowClockwise size={18} />{refreshing ? "Đang cập nhật…" : "Cập nhật"}</button>
    </div>
    {error ? <p className="booking-confirmation-error" role="alert">{error} <button type="button" onClick={() => void load()}>Thử lại</button></p> : null}
    {notice ? <p className="owner-booking-notice" role="status">{notice}</p> : null}
    <article className="portal-card owner-bookings-card">
      {loading ? <div className="portal-loading" role="status">Đang tải yêu cầu…</div>
        : items.length === 0 ? <div className="owner-bookings-empty"><strong>Chưa có yêu cầu thuê xe</strong><p>Khi khách đặt xe của bạn, yêu cầu sẽ xuất hiện tại đây.</p></div>
        : <div className="owner-booking-list">{items.map(item => <article className="owner-booking-item" key={item.bookingId}>
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
            {item.status === "PendingApproval" ? <div className="owner-booking-decision">
              <button className="owner-approve" type="button" disabled={!!busyId} onClick={() => void decide(item, "approve")}><Check size={17} />{busyId === item.bookingId ? "Đang xử lý…" : "Duyệt"}</button>
              <button className="owner-reject" type="button" disabled={!!busyId} onClick={() => void decide(item, "reject")}><X size={17} />Từ chối</button>
            </div> : null}
          </div>
        </article>)}</div>}
    </article>
  </>;
}
