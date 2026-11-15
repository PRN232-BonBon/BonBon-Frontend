import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowClockwise, ArrowLeft, CircleNotch, CrosshairSimple, WarningCircle } from "@phosphor-icons/react";
import { useAuth } from "../../auth/AuthContext";
import { bookingStatusLabel } from "../../booking/booking-status";
import { formatBookingDate } from "../../booking/booking-display";
import {
  TrackingApiError,
  getTrackingSnapshot,
  getTrackingStatus,
  trackingErrorMessage,
  type GeoPoint,
  type TrackingSnapshot,
  type TrackingStatus,
} from "../../tracking/tracking-api";
import type { OwnerBooking } from "../../owner/owner-api";
import {
  isMeetingPointsConfigurable,
  meetingPointsLockReason,
  trackingStateMessage,
  type MeetingPointTarget,
} from "../../tracking/tracking-display";
import { useTrackingHub } from "../../tracking/useTrackingHub";
import { MeetingPointsCard, type MeetingPointsDraft } from "./MeetingPointsCard";
import { TrackingMap } from "./TrackingMap";
import { TrackingSummary } from "./TrackingSummary";
import "./tracking.css";

type Phase = "loading" | "ready" | "waiting" | "needsMeetingPoints" | "inactive" | "blocked";

interface OwnerTrackingViewProps {
  booking: OwnerBooking;
  onBack: () => void;
}

/**
 * Bản đồ tracking của một booking. Luồng gọi API bám đúng backend:
 * `tracking/status` quyết định mở bản đồ hay chưa, `tracking/snapshot` lấy vị trí
 * mới nhất, SignalR `/hubs/tracking` cập nhật trực tiếp, và
 * `tracking/meeting-points` để chủ xe đặt điểm trả xe.
 */
export function OwnerTrackingView({ booking, onBack }: OwnerTrackingViewProps) {
  const { session } = useAuth();
  const [status, setStatus] = useState<TrackingStatus | null>(null);
  const [snapshot, setSnapshot] = useState<TrackingSnapshot | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [blockedMessage, setBlockedMessage] = useState("");
  const [refreshError, setRefreshError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [follow, setFollow] = useState(true);
  const [pickMode, setPickMode] = useState<MeetingPointTarget | null>(null);
  const [draft, setDraft] = useState<MeetingPointsDraft>({ pickup: null, return: null });
  const requestRef = useRef<AbortController | null>(null);
  const pickModeRef = useRef<MeetingPointTarget | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!session) return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;

    if (silent) setRefreshing(true);
    else setPhase("loading");
    setRefreshError("");

    try {
      const nextStatus = await getTrackingStatus(booking.bookingId, session, controller.signal);
      if (controller.signal.aborted) return;
      setStatus(nextStatus);

      if (!nextStatus.canTrack) {
        setSnapshot(null);
        setPhase(nextStatus.state === "Inactive" ? "inactive" : "needsMeetingPoints");
        return;
      }

      try {
        const nextSnapshot = await getTrackingSnapshot(booking.bookingId, session, controller.signal);
        if (controller.signal.aborted) return;
        setSnapshot(nextSnapshot);
        setPhase("ready");
      } catch (reason) {
        if (controller.signal.aborted) return;
        if (reason instanceof TrackingApiError && reason.code === "POSITION_NOT_AVAILABLE") {
          setSnapshot(null);
          setPhase("waiting");
          return;
        }
        throw reason;
      }
    } catch (reason) {
      if (controller.signal.aborted) return;
      if (silent) setRefreshError(trackingErrorMessage(reason));
      else {
        setPhase("blocked");
        setBlockedMessage(trackingErrorMessage(reason));
      }
    } finally {
      if (!controller.signal.aborted) setRefreshing(false);
    }
  }, [booking.bookingId, session]);

  useEffect(() => {
    void load();
    return () => requestRef.current?.abort();
  }, [load]);

  const applyUpdate = useCallback((update: TrackingSnapshot) => {
    setSnapshot((current) => (
      current && Date.parse(update.recordedAt) < Date.parse(current.recordedAt) ? current : update
    ));
    setPhase((current) => (current === "waiting" ? "ready" : current));
    setRefreshError("");
  }, []);

  const realtime = useTrackingHub({
    bookingId: booking.bookingId,
    accessToken: session?.accessToken ?? "",
    enabled: Boolean(session) && (phase === "ready" || phase === "waiting"),
    onUpdate: applyUpdate,
  });

  const position = useMemo<GeoPoint | null>(
    () => (snapshot ? { latitude: snapshot.latitude, longitude: snapshot.longitude } : null),
    [snapshot],
  );
  const destination = useMemo<GeoPoint | null>(
    () => (snapshot ? { latitude: snapshot.destinationLatitude, longitude: snapshot.destinationLongitude } : null),
    [snapshot],
  );

  const requestPick = useCallback((target: MeetingPointTarget) => {
    pickModeRef.current = target;
    setPickMode(target);
  }, []);

  const handlePick = useCallback((point: GeoPoint) => {
    const target = pickModeRef.current;
    if (!target) return;
    setDraft((current) => ({ ...current, [target]: point }));
    pickModeRef.current = null;
    setPickMode(null);
  }, []);

  const onFollowChange = useCallback((value: boolean) => setFollow(value), []);
  const handleSaved = useCallback(() => { void load(true); }, [load]);

  if (!session) return null;

  const configured = status?.meetingPointsConfigured ?? false;
  const meetingPointsEditable = isMeetingPointsConfigurable(booking.status)
    && !meetingPointsLockReason(booking.status, configured);
  const showSummary = phase === "ready" || phase === "waiting";
  const showMap = showSummary || phase === "needsMeetingPoints" || (phase === "inactive" && meetingPointsEditable);

  return (
    <div className="tracking-page">
      <div className="tracking-head">
        <div>
          <button className="tracking-back" type="button" onClick={onBack}>
            <ArrowLeft size={16} weight="bold" /> Danh sách chuyến
          </button>
          <h1>{booking.vehicleName}</h1>
          <p>
            <span className="tracking-plate">{booking.plateNumber}</span>
            <span>Khách thuê {booking.customerName}</span>
            <span className={`booking-status status-${booking.status.toLowerCase()}`}>{bookingStatusLabel(booking.status)}</span>
          </p>
        </div>
        <button
          className="icon-text-button"
          type="button"
          onClick={() => void load(true)}
          disabled={refreshing || phase === "loading"}
        >
          {refreshing
            ? <CircleNotch className="tracking-spin" size={16} />
            : <ArrowClockwise size={16} />}
          {refreshing ? "Đang cập nhật…" : "Cập nhật vị trí"}
        </button>
      </div>

      {phase === "loading" ? <div className="portal-loading">Đang kiểm tra trạng thái theo dõi…</div> : null}

      {phase === "blocked" ? (
        <article className="portal-card tracking-gate">
          <span className="tracking-gate-icon"><WarningCircle size={26} /></span>
          <div>
            <h2>Không xem được tracking</h2>
            <p>{blockedMessage}</p>
            <p className="tracking-gate-meta">Mã chuyến {booking.bookingId.slice(0, 8).toUpperCase()}</p>
          </div>
          <button className="owner-secondary-button" type="button" onClick={() => void load()}>Thử lại</button>
        </article>
      ) : null}

      {phase === "inactive" ? (
        <article className="portal-card tracking-gate">
          <span className="tracking-gate-icon"><WarningCircle size={26} /></span>
          <div>
            <h2>Tracking chưa mở</h2>
            <p>{trackingStateMessage("Inactive")}</p>
            <p className="tracking-gate-meta">
              Hạn thuê {formatBookingDate(booking.endAt)}
              {" · "}Mã chuyến {booking.bookingId.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <button className="owner-secondary-button" type="button" onClick={() => void load()}>Kiểm tra lại</button>
        </article>
      ) : null}

      {refreshError ? (
        <div className="tracking-realtime-error" role="status">
          <WarningCircle size={15} />
          <span>{refreshError}</span>
          <button type="button" onClick={() => void load(true)}>Thử lại</button>
        </div>
      ) : null}

      {showMap ? (
        <div className={`tracking-layout${showSummary ? "" : " is-single"}`}>
          <section className="tracking-map-card">
            <TrackingMap
              position={position}
              destination={destination}
              accuracyMeters={snapshot?.accuracyMeters ?? null}
              follow={follow}
              pickMode={pickMode}
              draftPickup={draft.pickup}
              draftReturn={draft.return}
              onPick={handlePick}
              onFollowChange={onFollowChange}
            />
            <div className="tracking-map-toolbar">
              <button
                type="button"
                className={follow ? "active" : ""}
                onClick={() => setFollow((value) => !value)}
                disabled={!position}
              >
                <CrosshairSimple size={16} /> {follow ? "Đang bám vị trí" : "Bám vị trí"}
              </button>
            </div>
            {pickMode ? (
              <p className="tracking-pick-hint">
                Nhấn lên bản đồ để chọn {pickMode === "pickup" ? "điểm nhận xe" : "điểm trả xe"}.
              </p>
            ) : null}
          </section>

          {showSummary ? (
            <TrackingSummary
              booking={booking}
              status={status}
              snapshot={snapshot}
              realtimeState={realtime.state}
              realtimeError={realtime.error}
              waiting={phase === "waiting"}
              onRetryRealtime={realtime.retry}
            />
          ) : null}
        </div>
      ) : null}

      {phase !== "loading" && phase !== "blocked" ? (
        <MeetingPointsCard
          bookingId={booking.bookingId}
          bookingStatus={booking.status}
          configured={configured}
          session={session}
          value={draft}
          onChange={setDraft}
          onRequestPick={requestPick}
          pickMode={pickMode}
          onSaved={handleSaved}
        />
      ) : null}
    </div>
  );
}
