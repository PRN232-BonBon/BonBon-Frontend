import { type FormEvent, useState } from "react";
import type { AuthSession } from "../../auth/auth-api";
import { confirmReturn, type ExcessMileageResult } from "../../booking/return-api";
import "./return-vehicle.css";

interface ReturnVehicleFormProps {
  bookingId: string;
  session: AuthSession;
  title: string;
  submitLabel: string;
  onClose: () => void;
  onReturned: (result: ExcessMileageResult) => void;
}

/** Form ghi nhận số km và tình trạng khi khách trả xe. */
export function ReturnVehicleForm({ bookingId, session, title, submitLabel, onClose, onReturned }: ReturnVehicleFormProps) {
  const [odometerKm, setOdometerKm] = useState("");
  const [conditionNotes, setConditionNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const odometer = Number(odometerKm.replace(",", "."));
    if (odometerKm.trim() === "" || !Number.isFinite(odometer) || odometer < 0) {
      setError("Vui lòng nhập số km hiện tại của xe (lớn hơn hoặc bằng 0).");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result = await confirmReturn(session, bookingId, {
        odometerKm: odometer,
        conditionNotes: conditionNotes.trim() || null,
      });
      onReturned(result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể xác nhận trả xe. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="return-form" onSubmit={(event) => void submit(event)} noValidate>
      <header>
        <h3>{title}</h3>
        <p>Nhập số km trên đồng hồ khi trả xe. Chủ xe sẽ đối chiếu và xác nhận sau khi nhận lại xe.</p>
      </header>
      <div className="return-grid">
        <label>
          <span>Số km hiện tại *</span>
          <input type="text" inputMode="decimal" value={odometerKm} onChange={(event) => setOdometerKm(event.target.value)} placeholder="Ví dụ: 45230" />
        </label>
        <label className="return-wide">
          <span>Tình trạng xe</span>
          <textarea rows={2} maxLength={2000} value={conditionNotes} onChange={(event) => setConditionNotes(event.target.value)} placeholder="Trầy xước, vệ sinh, đồ đạc khách để lại…" />
        </label>
      </div>
      {error ? <p className="return-error" role="alert">{error}</p> : null}
      <div className="return-actions">
        <button className="primary" type="submit" disabled={saving}>{saving ? "Đang gửi…" : submitLabel}</button>
        <button className="secondary" type="button" onClick={onClose} disabled={saving}>Huỷ</button>
      </div>
    </form>
  );
}
