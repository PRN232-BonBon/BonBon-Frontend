import * as L from "leaflet";

const pinIcon = (html: string) =>
  L.divIcon({ className: "bb-map-icon", html, iconSize: [34, 34], iconAnchor: [17, 17] });

export function vehicleIcon() {
  return pinIcon('<span class="bb-pin bb-pin-vehicle"><span class="bb-pin-dot"></span></span>');
}

export function destinationIcon() {
  return pinIcon(
    '<span class="bb-pin bb-pin-destination" title="Điểm trả xe">'
      + '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">'
      + '<path d="M6 3a1 1 0 0 1 1 1v1h10.5a1.5 1.5 0 0 1 1.2 2.4L16.6 10l2.1 2.6A1.5 1.5 0 0 1 17.5 15H7v6a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1Z" />'
      + "</svg></span>",
  );
}

export function draftIcon(label: string) {
  return pinIcon(`<span class="bb-pin bb-pin-draft">${label}</span>`);
}
