import { useEffect, useState } from "react";
import { CrosshairSimple, Flag, LockKey, MapPinLine } from "@phosphor-icons/react";
import type { AuthSession } from "../../auth/auth-api";
import {
  setMeetingPoints,
  trackingErrorMessage,
  type GeoPoint,
} from "../../tracking/tracking-api";
import { meetingPointsLockReason, type MeetingPointTarget } from "../../tracking/tracking-display";

export interface MeetingPointsDraft {
  pickup: GeoPoint | null;
  return: GeoPoint | null;
}

interface MeetingPointsCardProps {
  bookingId: string;
  bookingStatus: string;
  configured: boolean;
  session: AuthSession;
  value: MeetingPointsDraft;
  onChange: (next: MeetingPointsDraft) => void;
  onRequestPick: (target: MeetingPointTarget) => void;
  pickMode: MeetingPointTarget | null;
  onSaved: () => void;
}

/** Chủ xe đặt điểm nhận/điểm trả xe trước khi tracking mở (PUT tracking/meeting-points). */
export function MeetingPointsCard({
  bookingId,
  bookingStatus,
  configured,
  session,
  value,
  onChange,
  onRequestPick,
  pickMode,
  onSaved,
}: MeetingPointsCardProps) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const lockReason = meetingPointsLockReason(bookingStatus, configured);
  if (lockReason) {
    return (
      <article className="portal-card tracking-config is-locked">
        <span className="tracking-gate-icon"><LockKey size={24} /></span>
        <div>
          <h2>Điểm nhận và điểm trả xe</h2>
          <p>{lockReason}</p>
        </div>
      </article>
    );
  }

  async function submit() {
    if (!value.pickup || !value.return) {
      setMessage({ kind: "error", text: "Chọn đủ điểm nhận xe và điểm trả xe trước khi lưu." });
      return;
    }
    if (Math.abs(value.pickup.latitude) > 90 || Math.abs(value.return.latitude) > 90
      || Math.abs(value.pickup.longitude) > 180 || Math.abs(value.return.longitude) > 180) {
      setMessage({ kind: "error", text: "Toạ độ không hợp lệ: vĩ độ trong ±90, kinh độ trong ±180." });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      await setMeetingPoints(bookingId, {
        pickupLatitude: value.pickup.latitude,
        pickupLongitude: value.pickup.longitude,
        returnLatitude: value.return.latitude,
        returnLongitude: value.return.longitude,
      }, session);
      setMessage({ kind: "ok", text: "Đã lưu điểm nhận và điểm trả xe cho chuyến này." });
      onSaved();
    } catch (reason) {
      setMessage({ kind: "error", text: trackingErrorMessage(reason) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="portal-card tracking-config">
      <div className="card-heading">
        <div>
          <h2>Điểm nhận và điểm trả xe</h2>
          <p>
            Backend dùng điểm trả xe để tính khoảng cách và thời gian dự kiến. Nhấn lên bản đồ
            hoặc nhập toạ độ, sau đó lưu lại.
          </p>
        </div>
        {configured ? <span className="status-pill">Đã thiết lập</span> : null}
      </div>

      <div className="tracking-config-grid">
        <PointFields
          label="Điểm nhận xe"
          hint="Nơi giao xe cho khách."
          icon={<MapPinLine size={16} />}
          point={value.pickup}
          picking={pickMode === "pickup"}
          onRequestPick={() => onRequestPick("pickup")}
          onChange={(pickup) => onChange({ ...value, pickup })}
        />
        <PointFields
          label="Điểm trả xe"
          hint="Đích tính khoảng cách tracking."
          icon={<Flag size={16} />}
          point={value.return}
          picking={pickMode === "return"}
          onRequestPick={() => onRequestPick("return")}
          onChange={(returnPoint) => onChange({ ...value, return: returnPoint })}
        />
      </div>

      <div className="tracking-config-actions">
        {message ? <p className={`form-message ${message.kind}`}>{message.text}</p> : null}
        <button className="owner-primary-button" type="button" onClick={() => void submit()} disabled={saving}>
          {saving ? "Đang lưu…" : "Lưu điểm hẹn"}
        </button>
      </div>
    </article>
  );
}

interface PointFieldsProps {
  label: string;
  hint: string;
  icon: React.ReactNode;
  point: GeoPoint | null;
  picking: boolean;
  onRequestPick: () => void;
  onChange: (point: GeoPoint | null) => void;
}

function PointFields({ label, hint, icon, point, picking, onRequestPick, onChange }: PointFieldsProps) {
  const [latitude, setLatitude] = useState(point ? String(point.latitude) : "");
  const [longitude, setLongitude] = useState(point ? String(point.longitude) : "");

  useEffect(() => {
    if (!point) return;
    setLatitude(String(point.latitude));
    setLongitude(String(point.longitude));
  }, [point]);

  const commit = (nextLatitude: string, nextLongitude: string) => {
    const parsedLatitude = Number(nextLatitude.replace(",", "."));
    const parsedLongitude = Number(nextLongitude.replace(",", "."));
    const complete = nextLatitude.trim() !== "" && nextLongitude.trim() !== ""
      && Number.isFinite(parsedLatitude) && Number.isFinite(parsedLongitude);
    onChange(complete ? { latitude: parsedLatitude, longitude: parsedLongitude } : null);
  };

  return (
    <section className={`tracking-point${picking ? " picking" : ""}`}>
      <header>
        <h3>{icon}{label}</h3>
        <button className="tracking-point-pick" type="button" onClick={onRequestPick}>
          <CrosshairSimple size={15} /> {picking ? "Đang chọn…" : "Chọn trên bản đồ"}
        </button>
      </header>
      <p>{hint}</p>
      <div className="tracking-point-fields">
        <label>
          <span>Vĩ độ</span>
          <input
            type="text"
            inputMode="decimal"
            placeholder="21.028500"
            value={latitude}
            onChange={(event) => { setLatitude(event.target.value); commit(event.target.value, longitude); }}
          />
        </label>
        <label>
          <span>Kinh độ</span>
          <input
            type="text"
            inputMode="decimal"
            placeholder="105.854200"
            value={longitude}
            onChange={(event) => { setLongitude(event.target.value); commit(latitude, event.target.value); }}
          />
        </label>
      </div>
    </section>
  );
}
