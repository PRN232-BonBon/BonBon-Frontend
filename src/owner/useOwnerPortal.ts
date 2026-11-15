import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { getOwnerBookings, getOwnerVehicles, type OwnerBooking, type OwnerVehicle } from "./owner-api";

export function useOwnerPortal() {
  const { session } = useAuth();
  const [vehicles, setVehicles] = useState<OwnerVehicle[]>([]);
  const [bookings, setBookings] = useState<OwnerBooking[]>([]);
  const [loading, setLoading] = useState(true); const [refreshing, setRefreshing] = useState(false); const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const request = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    if (!session) return;
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    setRefreshing(true);
    try {
      const [cars, orders] = await Promise.all([getOwnerVehicles(session, controller.signal), getOwnerBookings(session, controller.signal)]);
      if (!controller.signal.aborted) { setVehicles(cars); setBookings(orders); setError(""); setRevision(value => value + 1); }
    } catch (reason) { if (!controller.signal.aborted) setError(reason instanceof TypeError ? "Không thể kết nối đến BonBon. Vui lòng thử lại." : reason instanceof Error ? reason.message : "Không thể tải dữ liệu."); }
    finally { if (!controller.signal.aborted) { setLoading(false); setRefreshing(false); } }
  }, [session]);
  useEffect(() => {
    void refresh();
    const onVisible = () => { if (document.visibilityState !== "hidden") void refresh(); };
    const timer = window.setInterval(onVisible, 30000);
    document.addEventListener("visibilitychange", onVisible);
    return () => { request.current?.abort(); clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [refresh]);
  return { vehicles, bookings, loading, refreshing, error, refresh, revision };
}
