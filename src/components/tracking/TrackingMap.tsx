import { useEffect, useRef } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GeoPoint } from "../../tracking/tracking-api";
import type { MeetingPointTarget } from "../../tracking/tracking-display";
import { destinationIcon, draftIcon, vehicleIcon } from "./tracking-markers";

const DEFAULT_CENTER: L.LatLngTuple = [21.0285, 105.8542];

interface TrackingMapProps {
  /** Vị trí mới nhất của xe do điện thoại người thuê gửi lên. */
  position: GeoPoint | null;
  /** Điểm trả xe mà backend dùng để tính khoảng cách. */
  destination: GeoPoint | null;
  accuracyMeters?: number | null;
  follow: boolean;
  pickMode: MeetingPointTarget | null;
  draftPickup: GeoPoint | null;
  draftReturn: GeoPoint | null;
  onPick?: (point: GeoPoint) => void;
  onFollowChange?: (follow: boolean) => void;
}

/**
 * Bản đồ Leaflet + tile OpenStreetMap. Component chỉ lo hiển thị: mọi dữ liệu
 * đến từ snapshot/realtime của backend, và mọi thay đổi chế độ chọn điểm nằm ở
 * component cha.
 */
export function TrackingMap({
  position,
  destination,
  accuracyMeters = null,
  follow,
  pickMode,
  draftPickup,
  draftReturn,
  onPick,
  onFollowChange,
}: TrackingMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const vehicleRef = useRef<L.Marker | null>(null);
  const destinationRef = useRef<L.Marker | null>(null);
  const accuracyRef = useRef<L.Circle | null>(null);
  const connectorRef = useRef<L.Polyline | null>(null);
  const draftPickupRef = useRef<L.Marker | null>(null);
  const draftReturnRef = useRef<L.Marker | null>(null);
  const fittedRef = useRef(false);
  const callbacksRef = useRef({ onPick, onFollowChange });

  useEffect(() => {
    callbacksRef.current = { onPick, onFollowChange };
  }, [onPick, onFollowChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const map = L.map(container, { center: DEFAULT_CENTER, zoom: 12 });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    map.on("click", (event: L.LeafletMouseEvent) => {
      callbacksRef.current.onPick?.({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    });
    map.on("dragstart", () => callbacksRef.current.onFollowChange?.(false));

    mapRef.current = map;
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);

    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      vehicleRef.current = null;
      destinationRef.current = null;
      accuracyRef.current = null;
      connectorRef.current = null;
      draftPickupRef.current = null;
      draftReturnRef.current = null;
      fittedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const vehiclePoint = position ? L.latLng(position.latitude, position.longitude) : null;
    const destinationPoint = destination ? L.latLng(destination.latitude, destination.longitude) : null;

    if (vehiclePoint) {
      if (vehicleRef.current) vehicleRef.current.setLatLng(vehiclePoint);
      else vehicleRef.current = L.marker(vehiclePoint, { icon: vehicleIcon(), zIndexOffset: 600, keyboard: false }).addTo(map);
    } else if (vehicleRef.current) {
      vehicleRef.current.remove();
      vehicleRef.current = null;
    }

    if (vehiclePoint && accuracyMeters !== null && accuracyMeters > 0) {
      if (accuracyRef.current) accuracyRef.current.setLatLng(vehiclePoint).setRadius(accuracyMeters);
      else {
        accuracyRef.current = L.circle(vehiclePoint, {
          radius: accuracyMeters,
          color: "#f4b000",
          weight: 1,
          fillColor: "#f4b000",
          fillOpacity: 0.12,
          interactive: false,
        }).addTo(map);
      }
    } else if (accuracyRef.current) {
      accuracyRef.current.remove();
      accuracyRef.current = null;
    }

    if (destinationPoint) {
      if (destinationRef.current) destinationRef.current.setLatLng(destinationPoint);
      else destinationRef.current = L.marker(destinationPoint, { icon: destinationIcon(), zIndexOffset: 400, keyboard: false }).addTo(map);
    } else if (destinationRef.current) {
      destinationRef.current.remove();
      destinationRef.current = null;
    }

    if (vehiclePoint && destinationPoint) {
      if (connectorRef.current) connectorRef.current.setLatLngs([vehiclePoint, destinationPoint]);
      else {
        connectorRef.current = L.polyline([vehiclePoint, destinationPoint], {
          color: "#b17900",
          weight: 3,
          opacity: 0.65,
          dashArray: "7 7",
          interactive: false,
        }).addTo(map);
      }
    } else if (connectorRef.current) {
      connectorRef.current.remove();
      connectorRef.current = null;
    }

    if (vehiclePoint && destinationPoint) {
      if (!fittedRef.current) {
        map.fitBounds(L.latLngBounds([vehiclePoint, destinationPoint]).pad(0.28), { animate: false });
        fittedRef.current = true;
      } else if (follow) {
        map.setView(vehiclePoint, Math.max(map.getZoom(), 15));
      }
    } else if (vehiclePoint && !fittedRef.current) {
      map.setView(vehiclePoint, 15);
      fittedRef.current = true;
    }
  }, [position, destination, accuracyMeters, follow]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const sync = (marker: L.Marker | null, point: GeoPoint | null, label: string) => {
      if (!point) {
        marker?.remove();
        return null;
      }
      const latLng = L.latLng(point.latitude, point.longitude);
      if (marker) {
        marker.setLatLng(latLng);
        return marker;
      }
      return L.marker(latLng, { icon: draftIcon(label), zIndexOffset: 300, keyboard: false }).addTo(map);
    };

    draftPickupRef.current = sync(draftPickupRef.current, draftPickup, "1");
    draftReturnRef.current = sync(draftReturnRef.current, draftReturn, "2");

    if (!fittedRef.current) {
      const points = [draftPickup, draftReturn]
        .filter((point): point is GeoPoint => Boolean(point))
        .map((point) => L.latLng(point.latitude, point.longitude));
      if (points.length > 0) {
        map.fitBounds(L.latLngBounds(points).pad(0.4), { animate: false });
        fittedRef.current = true;
      }
    }
  }, [draftPickup, draftReturn]);

  useEffect(() => {
    containerRef.current?.classList.toggle("is-picking", Boolean(pickMode));
  }, [pickMode]);

  return <div ref={containerRef} className="tracking-map" role="application" aria-label="Bản đồ theo dõi vị trí xe" />;
}
