import { useEffect, useState } from "react";
import { Broadcast } from "@phosphor-icons/react";
import type { AuthSession } from "../../auth/auth-api";
import { formatRelativeTime } from "../../tracking/tracking-display";
import { useLocationSharing } from "../../tracking/useLocationSharing";
import "./tracking.css";

interface ShareLocationControlProps {
  bookingId: string;
  session: AuthSession;
}

/**
 * Nút chia sẻ GPS cho người thuê ngay trên web. Dùng chung endpoint
 * `POST tracking/positions` với app mobile nên chủ xe theo dõi được ở cả hai kênh.
 */
export function ShareLocationControl({ bookingId, session }: ShareLocationControlProps) {
  const sharing = useLocationSharing({ bookingId, session });
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!sharing.active) return;
    const timer = window.setInterval(() => setNow(Date.now()), 10_000);
    return () => window.clearInterval(timer);
  }, [sharing.active]);

  if (!sharing.supported) {
    return <p className="share-location-unsupported">Trình duyệt không hỗ trợ định vị GPS.</p>;
  }

  const status = sharing.error
    || (sharing.lastSentAt
      ? `Đã gửi ${formatRelativeTime(sharing.lastSentAt, now)}`
      : sharing.active
        ? "Đang lấy vị trí GPS…"
        : "Chủ xe sẽ thấy vị trí của bạn");

  return (
    <div
      className={`share-location${sharing.active ? " is-active" : ""}`}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        aria-pressed={sharing.active}
        title={sharing.active ? "Dừng gửi vị trí cho chủ xe" : "Gửi vị trí GPS cho chủ xe trong lúc thuê"}
        onClick={() => { if (sharing.active) sharing.stop(); else sharing.start(); }}
      >
        <Broadcast size={17} weight={sharing.active ? "fill" : "regular"} />
        {sharing.active ? "Dừng chia sẻ" : "Chia sẻ vị trí"}
      </button>
      <span
        className={`share-location-status${sharing.error ? " is-error" : ""}`}
        role={sharing.error ? "alert" : undefined}
      >
        {status}
      </span>
    </div>
  );
}
