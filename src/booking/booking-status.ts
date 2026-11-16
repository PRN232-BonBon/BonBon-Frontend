const statusLabels: Record<string, string> = {
  PendingApproval: "Chờ xác nhận", AwaitingPayment: "Chờ thanh toán",
  Confirmed: "Đã thanh toán", ReadyForPickup: "Sẵn sàng nhận xe", InProgress: "Đang thuê",
  Returned: "Đã trả xe", AwaitingSettlement: "Chờ quyết toán", Completed: "Hoàn thành",
  Cancelled: "Đã hủy", Rejected: "Đã từ chối",
};

export function bookingStatusLabel(status: string) { return statusLabels[status] ?? "Đang cập nhật"; }
export function canPayBooking(booking: { status: string; startAt: string }, now = Date.now()) {
  return booking.status === "AwaitingPayment" && Date.parse(booking.startAt) > now;
}
export function isPaidBooking(status: string) {
  return ["Confirmed", "ReadyForPickup", "InProgress", "Returned", "AwaitingSettlement", "Completed"].includes(status);
}

export function canConfirmPickup(status: string) {
  return status === "Confirmed" || status === "ReadyForPickup";
}

const cancellableStatuses = new Set(["PendingApproval", "AwaitingPayment"]);

export function canCancelBooking(status: string) {
  return cancellableStatuses.has(status);
}
