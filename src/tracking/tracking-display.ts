import type { TrackingRealtimeState } from "./useTrackingHub";

export type MeetingPointTarget = "pickup" | "return";

/** Trạng thái booking mà chủ xe còn được thiết lập điểm trả xe (TrackingRules.ConfigurableStatuses). */
const configurableStatuses = ["Confirmed", "ReadyForPickup", "InProgress"];

export function isMeetingPointsConfigurable(status: string) {
  return configurableStatuses.includes(status);
}

/** Lý do khoá form điểm trả xe, hoặc null khi vẫn sửa được. */
export function meetingPointsLockReason(status: string, configured: boolean) {
  if (!isMeetingPointsConfigurable(status)) {
    return "Chỉ thiết lập điểm trả xe khi booking đã được xác nhận và chưa kết thúc.";
  }
  if (status === "InProgress" && configured) {
    return "Chuyến đang diễn ra nên điểm trả xe đã được khoá.";
  }
  return null;
}

export function trackingStateMessage(state: string) {
  switch (state) {
    case "Ready":
      return "Tracking đang mở. Vị trí xe cập nhật từ điện thoại của người thuê.";
    case "MeetingPointsMissing":
      return "Chưa thiết lập điểm trả xe nên backend chưa tính được khoảng cách cho chuyến này.";
    case "Inactive":
      return "Tracking chỉ mở trong thời gian thuê: bật khi chủ xe bàn giao xe và tắt khi khách trả xe.";
    default:
      return "Chưa xem được vị trí cho chuyến này.";
  }
}

export function realtimeLabel(state: TrackingRealtimeState) {
  switch (state) {
    case "connected":
      return "Trực tiếp";
    case "connecting":
      return "Đang kết nối";
    case "disconnected":
      return "Mất kết nối";
    default:
      return "Chưa kết nối";
  }
}

export function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  const kilometers = meters / 1000;
  const value = kilometers >= 10 ? kilometers.toFixed(0) : kilometers.toFixed(1).replace(".", ",");
  return `${value} km`;
}

/** Ước tính thời gian di chuyển theo tốc độ trung bình 25 km/h trong nội thành. */
export function estimateEtaSeconds(meters: number) {
  const seconds = meters / (25 / 3.6);
  return Math.min(Math.max(seconds, 30), 6 * 60 * 60);
}

export function formatDuration(seconds: number) {
  const minutes = Math.round(seconds / 60);
  if (minutes < 1) return "< 1 phút";
  if (minutes < 60) return `~${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `~${hours} giờ` : `~${hours} giờ ${rest} phút`;
}

export function formatRelativeTime(iso: string, now = Date.now()) {
  const seconds = Math.max(Math.round((now - Date.parse(iso)) / 1000), 0);
  if (seconds < 5) return "vừa xong";
  if (seconds < 60) return `${seconds} giây trước`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}
