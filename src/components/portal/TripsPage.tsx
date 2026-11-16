import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowClockwise, CalendarBlank, CaretRight, CreditCard, MapPin } from "@phosphor-icons/react";
import { useAuth } from "../../auth/AuthContext";
import { getMyBookings, cancelBooking, type CustomerBooking } from "../../portal/portal-api";
import { bookingStatusLabel, canCancelBooking, canPayBooking, isPaidBooking } from "../../booking/booking-status";
import { formatBookingDate, formatBookingMoney as money } from "../../booking/booking-display";
import { paymentErrorMessage } from "../../payment/payment-api";
import { OrderDetailModal } from "../booking/OrderDetailModal";
import { PaymentModal } from "../booking/PaymentModal";
import { ShareLocationControl } from "../tracking/ShareLocationControl";
import { EmptyState } from "./EmptyState";
import "./trips.css";

const historyStatuses = new Set(["Completed", "Cancelled", "Rejected"]);
type View = { kind: "detail" | "payment"; bookingId: string } | null;

export function TripsPage() {
  const { session } = useAuth();
  const [tab, setTab] = useState<"current" | "history">("current");
  const [items, setItems] = useState<CustomerBooking[]>([]);
  const [itemsOwner, setItemsOwner] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<View>(() => {
    const bookingId = new URLSearchParams(window.location.search).get("payment");
    return bookingId ? { kind: "payment", bookingId } : null;
  });
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const priorAccount = useRef<string | null>(null);
  useEffect(() => {
    const account = session?.account.accountId ?? null;
    if (priorAccount.current && priorAccount.current !== account) setView(null);
    priorAccount.current = account;
  }, [session?.account.accountId]);
  const request = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    if (!session) { setLoading(false); return; }
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setRefreshing(true);
    try {
      const bookings = await getMyBookings(session, controller.signal);
      if (!controller.signal.aborted) { setItems(bookings); setItemsOwner(session.account.accountId); setError(""); }
    } catch (reason) { if (!controller.signal.aborted) setError(paymentErrorMessage(reason)); }
    finally { if (!controller.signal.aborted) { setLoading(false); setRefreshing(false); } }
  }, [session]);
  useEffect(() => {
    void load();
    const refreshVisible = () => { if (document.visibilityState !== "hidden") void load(); };
    const timer = window.setInterval(refreshVisible, 15000);
    window.addEventListener("focus", refreshVisible);
    document.addEventListener("visibilitychange", refreshVisible);
    return () => { request.current?.abort(); clearInterval(timer); window.removeEventListener("focus", refreshVisible); document.removeEventListener("visibilitychange", refreshVisible); };
  }, [load]);
  const onPaid = useCallback(() => { void load(); }, [load]);

  const handleCancel = useCallback(async (bookingId: string) => {
    if (!session || cancellingId) return;
    if (!window.confirm("Bạn chắc chắn muốn hủy đơn đặt xe này? Hành động này không thể hoàn tác.")) return;
    setCancellingId(bookingId);
    try {
      await cancelBooking(bookingId, session);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể hủy đơn đặt xe.");
    } finally {
      setCancellingId(null);
    }
  }, [session, cancellingId, load]);

  const ownsItems = itemsOwner === session?.account.accountId;
  const visible = ownsItems ? items.filter((item) => tab === "history" ? historyStatuses.has(item.status) : !historyStatuses.has(item.status)) : [];
  return <>
    <div className="portal-title-row"><h1>Chuyến của tôi</h1><button className="trip-refresh" type="button" disabled={refreshing} onClick={() => void load()}><ArrowClockwise size={18} />{refreshing ? "Đang cập nhật…" : "Cập nhật"}</button></div>
    <div className="portal-tabs"><button className={tab === "current" ? "active" : ""} onClick={() => setTab("current")} type="button">Chuyến hiện tại</button><button className={tab === "history" ? "active" : ""} onClick={() => setTab("history")} type="button">Lịch sử chuyến</button></div>
    {error ? <p className="booking-confirmation-error" role="alert">{error} <button type="button" onClick={() => void load()}>Thử lại</button></p> : null}
    <article className="portal-card trip-list-card">
      {loading ? <div className="portal-loading" role="status">Đang tải chuyến…</div>
        : visible.length === 0 && !error ? <EmptyState image="/assets/portal/empty-trips.webp" title={tab === "current" ? "Bạn chưa có chuyến" : "Chưa có lịch sử chuyến"} description={tab === "current" ? "Một chuyến đi mới đang chờ bạn khám phá." : "Các chuyến đã hoàn thành sẽ xuất hiện tại đây."} action={tab === "current" ? <a className="button portal-primary" href="/#top">Đặt xe ngay</a> : undefined} />
        : <div className="trip-list">{visible.map(item => <article className="trip-item" key={item.bookingId} onClick={() => setView({ kind: "detail", bookingId: item.bookingId })}>
          <button className="trip-image-button" type="button" aria-label={`Xem chi tiết ${item.vehicleName}`} onClick={() => setView({ kind: "detail", bookingId: item.bookingId })}>
            {item.coverImageUrl ? <img src={item.coverImageUrl} alt={item.vehicleName} /> : <span className="trip-image-placeholder">BonBon</span>}
          </button>
          <div className="trip-main"><div className="trip-top"><h3><button type="button" onClick={() => setView({ kind: "detail", bookingId: item.bookingId })}>{item.vehicleName}</button></h3><span className={`booking-status status-${item.status.toLowerCase()}`}>{bookingStatusLabel(item.status)}</span></div>
            <p className="plate">{item.plateNumber}</p><p><CalendarBlank size={17} />{formatBookingDate(item.startAt)}</p><p className="trip-end">đến {formatBookingDate(item.endAt)}</p><p><MapPin size={17} />Nhận xe tại địa chỉ của chủ xe</p>
            {item.status === "PendingApproval" ? <p className="trip-waiting-hint">Đơn đặt cũ đang chờ xử lý. Vui lòng liên hệ BonBon để được hỗ trợ.</p> : null}
          </div>
          <div className="trip-actions"><strong className="trip-price">{money(item.totalAmount)}</strong>
            {item.status === "InProgress" && session ? <ShareLocationControl bookingId={item.bookingId} session={session} /> : null}
            {!historyStatuses.has(item.status) && item.status !== "InProgress" ? <button className="trip-pay" type="button" disabled={!canPayBooking(item)} title={item.status === "PendingApproval" ? "Đơn đặt cũ đang chờ xử lý" : undefined}
              onClick={event => { event.stopPropagation(); if (canPayBooking(item)) setView({ kind: "payment", bookingId: item.bookingId }); }}><CreditCard size={18} />{isPaidBooking(item.status) ? "Đã thanh toán" : "Thanh toán"}</button> : null}
            {canCancelBooking(item.status) ? <button className="trip-cancel" type="button" disabled={cancellingId === item.bookingId}
              onClick={event => { event.stopPropagation(); void handleCancel(item.bookingId); }}>{cancellingId === item.bookingId ? "Đang hủy…" : "Hủy đơn"}</button> : null}
            <button className="trip-view-detail" type="button" onClick={event => { event.stopPropagation(); setView({ kind: "detail", bookingId: item.bookingId }); }}>Xem chi tiết<CaretRight size={15} /></button>
          </div>
        </article>)}</div>}
    </article>
    {ownsItems && view?.kind === "detail" ? <OrderDetailModal bookingId={view.bookingId} onClose={() => setView(null)} onCancelled={() => { setView(null); void load(); }} onPayment={() => setView({ kind: "payment", bookingId: view.bookingId })} /> : null}
    {ownsItems && view?.kind === "payment" ? <PaymentModal bookingId={view.bookingId} onClose={() => setView(null)} onPaid={onPaid} /> : null}
  </>;
}
