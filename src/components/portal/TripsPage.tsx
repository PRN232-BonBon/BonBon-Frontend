import { useEffect, useState } from "react";
import { CalendarBlank, MapPin } from "@phosphor-icons/react";
import { useAuth } from "../../auth/AuthContext";
import { getMyBookings, type CustomerBooking } from "../../portal/portal-api";
import { formatVnd } from "../../payment/payment-presentation";
import { PaymentButton } from "../payment/PaymentButton";
import { EmptyState } from "./EmptyState";

const historyStatuses = new Set(["Completed", "Cancelled", "Rejected"]);
const formatDate = (value: string) => new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value));
const bookingLabels: Record<string, string> = { PendingApproval: "Chờ chủ xe duyệt", AwaitingPayment: "Chờ thanh toán", Confirmed: "Đã xác nhận", ReadyForPickup: "Sẵn sàng nhận xe", InProgress: "Đang thuê", Returned: "Đã trả xe", AwaitingSettlement: "Chờ quyết toán", Completed: "Hoàn tất", Cancelled: "Đã hủy", Rejected: "Bị từ chối" };

export function TripsPage() {
  const { session } = useAuth();
  const [tab, setTab] = useState<"current" | "history">("current");
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<{ accountId: string; items: CustomerBooking[]; error: string | null; loading: boolean } | null>(null);
  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    setState({ accountId: session.account.accountId, items: [], error: null, loading: true });
    getMyBookings(session, controller.signal)
      .then(items => { if (!controller.signal.aborted) setState({ accountId: session.account.accountId, items, error: null, loading: false }); })
      .catch(() => { if (!controller.signal.aborted) setState({ accountId: session.account.accountId, items: [], error: "Không thể tải danh sách chuyến. Vui lòng kiểm tra kết nối hoặc đăng nhập lại rồi thử lại.", loading: false }); });
    return () => controller.abort();
  }, [session, retry]);

  const own = session && state?.accountId === session.account.accountId ? state : null;
  const visible = own?.items.filter(item => tab === "history" ? historyStatuses.has(item.status) : !historyStatuses.has(item.status)) ?? [];
  if (!session) return <div className="portal-card">Vui lòng đăng nhập để xem chuyến của bạn.</div>;
  return <>
    <div className="portal-title-row"><h1>Chuyến của tôi</h1></div>
    <div className="portal-tabs"><button className={tab === "current" ? "active" : ""} onClick={() => setTab("current")} type="button">Chuyến hiện tại</button><button className={tab === "history" ? "active" : ""} onClick={() => setTab("history")} type="button">Lịch sử chuyến</button></div>
    <article className="portal-card trip-list-card">
      {!own || own.loading ? <div className="portal-loading" role="status">Đang tải chuyến...</div> : own.error ? <div className="payment-load-error" role="alert"><p>{own.error}</p><button className="button portal-primary" type="button" onClick={() => setRetry(value => value + 1)}>Tải lại chuyến</button></div>
        : visible.length === 0 ? <EmptyState image="/assets/portal/empty-trips.webp" title={tab === "current" ? "Bạn chưa có chuyến" : "Chưa có lịch sử chuyến"} description={tab === "current" ? "Một chuyến đi mới đang chờ bạn khám phá." : "Các chuyến đã hoàn thành sẽ xuất hiện tại đây."} action={tab === "current" ? <a className="button portal-primary" href="/#top">Đặt xe ngay</a> : undefined} />
          : <div className="trip-list">{visible.map(item => <div className="trip-item" key={item.bookingId}>
            {item.coverImageUrl ? <img src={item.coverImageUrl} alt={item.vehicleName} /> : <div className="trip-image-placeholder">BonBon</div>}
            <div className="trip-main"><div className="trip-top"><h3>{item.vehicleName}</h3><span className={`booking-status status-${item.status.toLowerCase()}`}>{bookingLabels[item.status] ?? item.status}</span></div><p className="plate">{item.plateNumber}</p><p><CalendarBlank /> {formatDate(item.startAt)} — {formatDate(item.endAt)}</p><p><MapPin /> Nhận xe tại địa chỉ của chủ xe</p></div>
            <div className="trip-payment-column"><strong className="trip-price">{item.currency === "VND" ? formatVnd(item.totalAmount) : `${item.totalAmount.toLocaleString("vi-VN")} ${item.currency}`}</strong><PaymentButton key={`${session.account.accountId}:${item.bookingId}`} booking={item} /></div>
          </div>)}</div>}
    </article>
  </>;
}
