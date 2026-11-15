import type { OwnerBooking, OwnerBlock, OwnerVehicle } from "./owner-api";

// Named roles reuse existing, optimized portal artwork; no duplicate image files.
export const ownerPortalAssets = {
  emptyVehicles: "/assets/portal/empty-favorites.webp",
  emptyCalendar: "/assets/portal/empty-trips.webp",
  emptyLocation: "/assets/portal/empty-addresses.webp",
};
const vehicleLabels: Record<string, string> = { Available: "Đang hoạt động", PendingApproval: "Chờ duyệt", Rejected: "Bị từ chối", Suspended: "Dừng hoạt động", Archived: "Đã lưu trữ", Draft: "Bản nháp" };
export function ownerVehicleStatus(status: string) { return vehicleLabels[status] || "Đang cập nhật"; }
export function normalizedSearch(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase(); }
export function matchesOwnerVehicle(vehicle: OwnerVehicle, query: string) {
  return normalizedSearch(`${vehicle.brand} ${vehicle.model} ${vehicle.plateNumber}`).includes(normalizedSearch(query.trim()));
}
export function vietnamDay(value: string | number | Date) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
export function addDay(day: string, amount: number) {
  return new Date(Date.parse(`${day}T00:00:00Z`) + amount * 86400000).toISOString().slice(0, 10);
}
export function mondayOfWeek(day: string) {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  return addDay(day, -((weekday + 6) % 7));
}
export function calendarWindow(day: string) { return { startAt: `${day}T00:00:00+07:00`, endAt: `${addDay(day, 14)}T00:00:00+07:00` }; }
export function overlapsDay(item: { startAt: string; endAt: string }, day: string) {
  const start = Date.parse(`${day}T00:00:00+07:00`);
  return Date.parse(item.startAt) < start + 86400000 && Date.parse(item.endAt) > start;
}
const activeBookings = new Set(["PendingApproval", "AwaitingPayment", "Confirmed", "ReadyForPickup", "InProgress", "Returned", "AwaitingSettlement", "Completed"]);
export function bookingsOnDay(bookings: OwnerBooking[], vehicleId: string, day: string) {
  return bookings.filter(item => item.vehicleId === vehicleId && activeBookings.has(item.status) && overlapsDay(item, day))
    .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
}
export function blocksOnDay(blocks: OwnerBlock[], vehicleId: string, day: string) { return blocks.filter(item => item.vehicleId === vehicleId && overlapsDay(item, day)); }
export function calendarBookingTone(status: string) { return status === "PendingApproval" ? "pending" : status === "AwaitingPayment" ? "payment" : ["Confirmed", "ReadyForPickup", "InProgress", "Returned", "AwaitingSettlement", "Completed"].includes(status) ? "reserved" : "inactive"; }
export function canDecideOwnerBooking(booking: { status: string; startAt: string }, now = Date.now()) { return booking.status === "PendingApproval" && Date.parse(booking.startAt) > now; }
