import { useEffect, useRef, useState } from "react";
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { trackingHubUrl, type TrackingSnapshot } from "./tracking-api";

export type TrackingRealtimeState = "idle" | "connecting" | "connected" | "disconnected";

interface UseTrackingHubOptions {
  bookingId: string;
  accessToken: string;
  /** Chỉ mở hub khi backend đã cho phép theo dõi (status.canTrack). */
  enabled: boolean;
  onUpdate: (snapshot: TrackingSnapshot) => void;
}

export interface TrackingHubResult {
  state: TrackingRealtimeState;
  error: string;
  retry: () => void;
}

/**
 * Kết nối `/hubs/tracking` để nhận `PositionUpdated` của booking hiện tại.
 * Backend xác thực JWT và kiểm tra chủ xe trước khi cho vào nhóm `booking:{id}`;
 * vì vậy phải gọi `JoinBooking` lại sau mỗi lần reconnect.
 */
export function useTrackingHub({ bookingId, accessToken, enabled, onUpdate }: UseTrackingHubOptions): TrackingHubResult {
  const [state, setState] = useState<TrackingRealtimeState>("idle");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const updateRef = useRef(onUpdate);
  const tokenRef = useRef(accessToken);

  useEffect(() => { updateRef.current = onUpdate; }, [onUpdate]);
  useEffect(() => { tokenRef.current = accessToken; }, [accessToken]);

  useEffect(() => {
    if (!enabled) {
      setState("idle");
      setError("");
      return;
    }

    let cancelled = false;
    setState("connecting");
    setError("");

    const connection = new HubConnectionBuilder()
      .withUrl(trackingHubUrl(), { accessTokenFactory: () => tokenRef.current })
      .withAutomaticReconnect([0, 2_000, 5_000, 10_000, 20_000])
      .configureLogging(LogLevel.Warning)
      .build();

    const join = () => connection.invoke("JoinBooking", bookingId);

    connection.on("PositionUpdated", (payload: TrackingSnapshot) => {
      if (cancelled) return;
      updateRef.current(payload);
    });

    connection.onreconnecting(() => {
      if (cancelled) return;
      setState("connecting");
      setError("Đang kết nối lại realtime…");
    });

    connection.onreconnected(() => {
      if (cancelled) return;
      setState("connected");
      setError("");
      join().catch(() => {
        if (!cancelled) setError("Không vào lại được nhóm theo dõi của chuyến này.");
      });
    });

    connection.onclose(() => {
      if (cancelled) return;
      setState("disconnected");
      setError("Mất kết nối realtime. Bản đồ vẫn hiển thị vị trí mới nhất.");
    });

    void (async () => {
      try {
        await connection.start();
        if (cancelled) {
          await connection.stop();
          return;
        }
        await join();
        if (!cancelled) setState("connected");
      } catch {
        if (cancelled) return;
        setState("disconnected");
        setError("Không kết nối được realtime. Bấm Kết nối lại hoặc tải lại vị trí.");
        await connection.stop().catch(() => undefined);
      }
    })();

    return () => {
      cancelled = true;
      void connection.stop();
    };
  }, [bookingId, enabled, attempt]);

  return { state, error, retry: () => setAttempt((value) => value + 1) };
}
