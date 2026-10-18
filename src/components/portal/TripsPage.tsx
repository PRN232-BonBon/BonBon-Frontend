import { useEffect, useState } from "react";
import { CalendarBlank, MapPin } from "@phosphor-icons/react";
import { useAuth } from "../../auth/AuthContext";
import { getMyBookings, type CustomerBooking } from "../../portal/portal-api";
import { EmptyState } from "./EmptyState";

const historyStatuses = new Set(["Completed", "Cancelled", "Rejected"]);
const formatDate = (value: string) => new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));

export function TripsPage() {
  const { session } = useAuth();
  const [tab, setTab] = useState<"current" | "history">("current");
  const [items, setItems] = useState<CustomerBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) { setLoading(false); return; }
    getMyBookings(session).then(setItems).catch(() => setItems([])).finally(() => setLoading(false));
  }, [session]);

  const visible = items.filter((item) => tab === "history" ? historyStatuses.has(item.status) : !historyStatuses.has(item.status));
  return <><div className="portal-title-row"><h1>Chuyến của tôi</h1></div><div className="portal-tabs"><button className={tab === "current" ? "active" : ""} onClick={() => setTab("current")} type="button">Chuyến hiện tại</button><button className={tab === "history" ? "active" : ""} onClick={() => setTab("history")} type="button">Lịch sử chuyến</button></div><article className="portal-card trip-list-card">{loading ? <div className="portal-loading">Đang tải chuyến...</div> : visible.length === 0 ? <EmptyState image="/assets/portal/empty-trips.png" title={tab === "current" ? "Bạn chưa có chuyến" : "Chưa có lịch sử chuyến"} description={tab === "current" ? "Một chuyến đi mới đang chờ bạn khám phá." : "Các chuyến đã hoàn thành sẽ xuất hiện tại đây."} action={tab === "current" ? <a className="button portal-primary" href="/#top">Đặt xe ngay</a> : undefined} /> : <div className="trip-list">{visible.map((item) => <div className="trip-item" key={item.bookingId}>{item.coverImageUrl ? <img src={item.coverImageUrl} alt={item.vehicleName} /> : <div className="trip-image-placeholder">BonBon</div>}<div className="trip-main"><div className="trip-top"><h3>{item.vehicleName}</h3><span className={`booking-status status-${item.status.toLowerCase()}`}>{item.status}</span></div><p className="plate">{item.plateNumber}</p><p><CalendarBlank /> {formatDate(item.startAt)} — {formatDate(item.endAt)}</p><p><MapPin /> Nhận xe tại địa chỉ của chủ xe</p></div><strong className="trip-price">{item.totalAmount.toLocaleString("vi-VN")}₫</strong></div>)}</div>}</article></>;
}
