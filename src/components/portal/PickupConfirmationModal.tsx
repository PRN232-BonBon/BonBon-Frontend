import { useRef, useState, type FormEvent } from "react";
import type { AuthSession } from "../../auth/auth-api";
import { confirmPickup } from "../../portal/portal-api";
import { BookingModalShell } from "../booking/BookingModalShell";

export function PickupConfirmationModal({ bookingId, session, onClose, onConfirmed }: {
  bookingId: string; session: AuthSession; onClose: () => void; onConfirmed: () => void;
}) {
  const [odometer, setOdometer] = useState("");
  const [conditionNotes, setConditionNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const value = Number(odometer);
    if (!odometer.trim() || !Number.isFinite(value) || value < 0 || value > 100000000) {
      setError("Vui lòng nhập số km trên đồng hồ từ 0 đến 100.000.000.");
      return;
    }
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await confirmPickup(bookingId, session, { odometerKm: value, conditionNotes: conditionNotes.trim() || null });
      onConfirmed();
    } catch (reason) {
      setError(reason instanceof Error ? `${reason.message} Vui lòng kiểm tra lại trạng thái chuyến trước khi thử lại.` : "Không thể xác nhận. Vui lòng kiểm tra lại trạng thái chuyến trước khi thử lại.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return <BookingModalShell title="Xác nhận nhận xe" onClose={onClose} busy={busy} className="pickup-confirmation-modal">
    <form className="pickup-confirmation" onSubmit={submit}>
      <p>Vui lòng xác nhận sau khi bạn đã nhận xe từ chủ xe.</p>
      <label htmlFor="pickup-odometer">Số km trên đồng hồ xe <span aria-hidden="true">*</span></label>
      <div className="pickup-odometer"><input id="pickup-odometer" type="number" inputMode="decimal" min="0" max="100000000" step="any" required
        value={odometer} onChange={event => setOdometer(event.target.value)} placeholder="Ví dụ: 15000" disabled={busy} /><span>km</span></div>
      <small>Ghi lại số km thực tế lúc nhận xe để đối chiếu khi trả xe.</small>
      <label htmlFor="pickup-condition">Tình trạng xe</label>
      <textarea id="pickup-condition" rows={3} maxLength={2000} value={conditionNotes}
        onChange={event => setConditionNotes(event.target.value)} placeholder="Ví dụ: Xe sạch sẽ, có vết xước nhỏ bên cửa trái" disabled={busy} />
      {error ? <p className="booking-confirmation-error" role="alert">{error}</p> : null}
      <div className="pickup-actions"><button type="button" className="booking-confirmation-cancel" onClick={onClose} disabled={busy}>Quay lại</button>
        <button type="submit" className="booking-confirmation-submit" disabled={busy}>{busy ? "Đang xác nhận…" : "Xác nhận đã nhận xe"}</button></div>
    </form>
  </BookingModalShell>;
}
