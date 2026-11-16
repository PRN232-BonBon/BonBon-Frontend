import { useEffect, useState } from "react";
import type { AuthSession } from "../../auth/auth-api";
import { getBookingDetail, type BookingDetail } from "../../portal/portal-api";
import { confirmOwnerReturn, getExcessMileage, type ExcessMileageResult } from "../../booking/return-api";
import { formatBookingMoney } from "../../booking/booking-display";
import "./return-vehicle.css";

export function ReturnReview({ bookingId, session, onClose, onConfirmed }: {
  bookingId: string; session: AuthSession; onClose: () => void; onConfirmed: () => void;
}) {
  const [detail, setDetail] = useState<BookingDetail | null>(null);
  const [mileage, setMileage] = useState<ExcessMileageResult | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([getBookingDetail(bookingId, session, controller.signal), getExcessMileage(session, bookingId, controller.signal)])
      .then(([booking, result]) => { if (!controller.signal.aborted) { setDetail(booking); setMileage(result); } })
      .catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Không thể tải biên bản trả xe."); });
    return () => controller.abort();
  }, [bookingId, session]);
  const pickup = detail?.inspections?.find(i => i.kind === "Pickup");
  const returned = detail?.inspections?.find(i => i.kind === "Return");
  const confirm = async () => {
    if (saving) return;
    setSaving(true); setError("");
    try { await confirmOwnerReturn(session, bookingId); onConfirmed(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể xác nhận trả xe."); }
    finally { setSaving(false); }
  };
  const km = (value: number | null | undefined) => value == null ? "Chưa có" : `${value.toLocaleString("vi-VN")} km`;
  return <section className="return-review" aria-label="Đối chiếu trả xe">
    <h3>Đối chiếu thông tin trả xe</h3>
    <p>Kiểm tra số km trên xe với biên bản trước khi xác nhận nhận lại xe.</p>
    {!detail && !error ? <p role="status">Đang tải biên bản…</p> : null}
    {detail && mileage ? <>
      <div className="return-review-stats">
        <div><span>Km khi nhận xe</span><strong>{km(pickup?.odometerKm)}</strong></div>
        <div><span>Km khi trả xe</span><strong>{km(returned?.odometerKm)}</strong></div>
        <div><span>Quãng đường đã đi</span><strong>{km(mileage.actualDistanceKm)}</strong></div>
        <div><span>Giới hạn của chuyến</span><strong>{mileage.includedMileageKm == null ? "Không giới hạn" : km(mileage.includedMileageKm)}</strong></div>
      </div>
      {returned?.conditionNotes ? <p>Tình trạng xe: {returned.conditionNotes}</p> : null}
      <div className="return-review-fee"><span>{mileage.excessKm > 0 ? `Vượt ${km(mileage.excessKm)} · ${formatBookingMoney(mileage.overageFeePerKm ?? 0)}/km` : "Không vượt giới hạn km"}</span><strong>{formatBookingMoney(mileage.excessFeeAmount)}</strong></div>
      <p>{mileage.excessFeeAmount > 0 ? "Sau khi xác nhận, khách sẽ thanh toán phụ phí trước khi chuyến kết thúc." : "Không có phụ phí vượt km. Chuyến sẽ kết thúc sau khi bạn xác nhận."}</p>
      <div className="return-actions"><button className="primary" type="button" onClick={() => void confirm()} disabled={saving || pickup?.odometerKm == null || returned?.odometerKm == null}>{saving ? "Đang xác nhận…" : "Xác nhận trả xe"}</button><button className="secondary" type="button" onClick={onClose} disabled={saving}>Đóng</button></div>
    </> : null}
    {error ? <p className="return-error" role="alert">{error}</p> : null}
  </section>;
}
