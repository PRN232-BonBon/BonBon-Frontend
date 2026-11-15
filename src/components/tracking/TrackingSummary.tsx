import { useEffect, useState } from "react";
import { CircleNotch, Flag, WifiSlash } from "@phosphor-icons/react";
import { formatBookingDate } from "../../booking/booking-display";
import type { TrackingSnapshot, TrackingStatus } from "../../tracking/tracking-api";
import type { OwnerBooking } from "../../owner/owner-api";
import {
  estimateEtaSeconds,
  formatDistance,
  formatDuration,
  formatRelativeTime,
  realtimeLabel,
} from "../../tracking/tracking-display";
import type { TrackingRealtimeState } from "../../tracking/useTrackingHub";

interface TrackingSummaryProps {
  booking: OwnerBooking;
  status: TrackingStatus | null;
  snapshot: TrackingSnapshot | null;
  realtimeState: TrackingRealtimeState;
  realtimeError: string;
  waiting: boolean;
  onRetryRealtime: () => void;
}

export function TrackingSummary({
  booking,
  status,
  snapshot,
  realtimeState,
  realtimeError,
  waiting,
  onRetryRealtime,
}: TrackingSummaryProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <aside className="portal-card tracking-panel">
      <div className="tracking-panel-top">
        <span className={`tracking-live tracking-live-${realtimeState}`}>
          <span className="tracking-live-dot" aria-hidden="true" />
          {realtimeLabel(realtimeState)}
        </span>
        {snapshot ? <span className="tracking-updated">{formatRelativeTime(snapshot.recordedAt, now)}</span> : null}
      </div>

      {realtimeError ? (
        <div className="tracking-realtime-error" role="status">
          <WifiSlash size={15} />
          <span>{realtimeError}</span>
          <button type="button" onClick={onRetryRealtime}>Kết nối lại</button>
        </div>
      ) : null}

      {snapshot?.arrived ? (
        <p className="tracking-arrived">
          <Flag size={16} weight="fill" />
          Xe đã tới điểm trả (trong phạm vi 30 m).
        </p>
      ) : null}

      <div className="tracking-stats">
        <div>
          <span>Còn cách điểm trả</span>
          <strong>{snapshot ? formatDistance(snapshot.distanceMeters) : "—"}</strong>
        </div>
        <div>
          <span>Dự kiến</span>
          <strong>{snapshot ? formatDuration(estimateEtaSeconds(snapshot.distanceMeters)) : "—"}</strong>
        </div>
        <div>
          <span>GPS ghi nhận</span>
          <strong>{snapshot ? formatRelativeTime(snapshot.recordedAt, now) : "—"}</strong>
        </div>
      </div>

      <dl className="tracking-facts">
        <div><dt>Khách thuê</dt><dd>{booking.customerName}{booking.customerPhone ? ` · ${booking.customerPhone}` : ""}</dd></div>
        <div><dt>Biển số</dt><dd>{booking.plateNumber}</dd></div>
        <div><dt>Mã chuyến</dt><dd>{booking.bookingId.slice(0, 8).toUpperCase()}</dd></div>
        <div><dt>Hạn thuê</dt><dd>{status?.deadline ? formatBookingDate(status.deadline) : formatBookingDate(booking.endAt)}</dd></div>
        {snapshot?.accuracyMeters != null ? <div><dt>Sai số GPS</dt><dd>±{Math.round(snapshot.accuracyMeters)} m</dd></div> : null}
        {snapshot ? (
          <div>
            <dt>Toạ độ xe</dt>
            <dd>{snapshot.latitude.toFixed(5)}, {snapshot.longitude.toFixed(5)}</dd>
          </div>
        ) : null}
      </dl>

      {waiting ? (
        <p className="tracking-waiting">
          <CircleNotch className="tracking-spin" size={15} />
          Đang chờ điện thoại người thuê gửi vị trí GPS…
        </p>
      ) : null}

      <p className="tracking-note">
        Vị trí do điện thoại của người thuê gửi lên; khoảng cách tới điểm trả xe do backend tính.
      </p>
    </aside>
  );
}
