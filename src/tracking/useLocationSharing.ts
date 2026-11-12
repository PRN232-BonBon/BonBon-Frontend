import { useCallback, useEffect, useRef, useState } from "react";
import type { AuthSession } from "../auth/auth-api";
import { TrackingApiError, reportTrackingPosition, trackingErrorMessage } from "./tracking-api";

export type LocationSharingState = "idle" | "starting" | "sharing" | "error";

export interface LocationSharingResult {
  supported: boolean;
  active: boolean;
  state: LocationSharingState;
  error: string;
  /** ISO của lần gửi GPS thành công gần nhất. */
  lastSentAt: string | null;
  accuracyMeters: number | null;
  start: () => void;
  stop: () => void;
}

interface UseLocationSharingOptions {
  bookingId: string;
  session: AuthSession;
  /** Khoảng tối thiểu giữa hai lần gửi GPS. */
  minIntervalMs?: number;
  /** Chỉ gửi khi người thuê đã di chuyển đủ xa kể từ lần gửi trước. */
  minDistanceMeters?: number;
}

function metersBetween(lat1: number, lng1: number, lat2: number, lng2: number) {
  const deltaLat = (lat2 - lat1) * 111_320;
  const deltaLng = (lng2 - lng1) * 111_320 * Math.cos((lat1 * Math.PI) / 180);
  return Math.hypot(deltaLat, deltaLng);
}

function geolocationErrorMessage(error: GeolocationPositionError) {
  switch (error.code) {
    case 1:
      return "Bạn chưa cấp quyền vị trí cho trang này. Hãy bật quyền vị trí rồi thử lại.";
    case 2:
      return "Không lấy được vị trí GPS. Kiểm tra định vị của thiết bị rồi thử lại.";
    case 3:
      return "Lấy vị trí quá lâu. Thử lại ở nơi thoáng hơn.";
    default:
      return "Không lấy được vị trí GPS.";
  }
}

/**
 * Chia sẻ GPS của người thuê từ trình duyệt: `watchPosition` rồi gửi lên
 * `POST /bookings/{id}/tracking/positions` (cùng endpoint app mobile đang dùng).
 * Backend chỉ nhận khi booking ở trạng thái InProgress và tự phát SignalR cho chủ xe.
 */
export function useLocationSharing({
  bookingId,
  session,
  minIntervalMs = 15_000,
  minDistanceMeters = 25,
}: UseLocationSharingOptions): LocationSharingResult {
  const [active, setActive] = useState(false);
  const [state, setState] = useState<LocationSharingState>("idle");
  const [error, setError] = useState("");
  const [lastSentAt, setLastSentAt] = useState<string | null>(null);
  const [accuracyMeters, setAccuracyMeters] = useState<number | null>(null);

  const watchRef = useRef<number | null>(null);
  const activeRef = useRef(false);
  const sendingRef = useRef(false);
  const lastSentRef = useRef<{ latitude: number; longitude: number; at: number } | null>(null);
  const sessionRef = useRef(session);
  const supported = typeof navigator !== "undefined" && "geolocation" in navigator;

  useEffect(() => { sessionRef.current = session; }, [session]);

  const stop = useCallback(() => {
    activeRef.current = false;
    setActive(false);
    setState("idle");
    if (watchRef.current !== null && typeof navigator !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
  }, []);

  const send = useCallback(async (position: GeolocationPosition) => {
    const { latitude, longitude, accuracy } = position.coords;

    const previous = lastSentRef.current;
    const now = Date.now();
    const movedMeters = previous
      ? metersBetween(previous.latitude, previous.longitude, latitude, longitude)
      : Number.POSITIVE_INFINITY;
    const tooSoon = previous !== null && now - previous.at < minIntervalMs && movedMeters < minDistanceMeters;
    if (tooSoon || sendingRef.current) return;

    sendingRef.current = true;
    try {
      const reportedAccuracy = Number.isFinite(accuracy) ? Math.round(accuracy) : null;
      await reportTrackingPosition(bookingId, {
        latitude,
        longitude,
        accuracyMeters: reportedAccuracy !== null && reportedAccuracy >= 0 ? reportedAccuracy : null,
        recordedAt: new Date(position.timestamp || now).toISOString(),
      }, sessionRef.current);

      lastSentRef.current = { latitude, longitude, at: now };
      setLastSentAt(new Date(now).toISOString());
      setAccuracyMeters(reportedAccuracy);
      setError("");
      setState("sharing");
    } catch (reason) {
      if (reason instanceof TrackingApiError && reason.code === "TRACKING_NOT_ACTIVE") {
        setError("Chuyến đã kết thúc nên không gửi vị trí được nữa.");
        stop();
        return;
      }
      if (reason instanceof TrackingApiError && reason.isSessionExpired) {
        setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục chia sẻ vị trí.");
        stop();
        return;
      }
      setError(trackingErrorMessage(reason));
      setState("error");
    } finally {
      sendingRef.current = false;
    }
  }, [bookingId, minDistanceMeters, minIntervalMs, stop]);

  const start = useCallback(() => {
    if (!supported) {
      setError("Trình duyệt không hỗ trợ định vị GPS.");
      setState("error");
      return;
    }
    if (activeRef.current) return;

    activeRef.current = true;
    setActive(true);
    setState("starting");
    setError("");
    lastSentRef.current = null;

    watchRef.current = navigator.geolocation.watchPosition(
      (position) => {
        if (!activeRef.current) return;
        void send(position);
      },
      (geoError) => {
        if (!activeRef.current) return;
        setError(geolocationErrorMessage(geoError));
        setState("error");
        if (geoError.code === 1) stop();
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 },
    );
  }, [send, stop, supported]);

  useEffect(() => stop, [stop]);

  return { supported, active, state, error, lastSentAt, accuracyMeters, start, stop };
}
