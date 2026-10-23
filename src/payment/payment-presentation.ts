import type { PaymentStatusResponse } from "./payment-types";

export const formatVnd = (value: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
export const PAYMENT_POLL_INTERVAL = 5000;
export const PAYMENT_POLL_LIMIT = 12;

export function paymentPresentation(payment: PaymentStatusResponse) {
  // A receipt may be Succeeded but still require reconciliation; never show a green success in that case.
  if (payment.requiresReconciliation) return { tone: "warning", title: "Cần đối soát giao dịch", detail: "BonBon cần kiểm tra thêm giao dịch này. Vui lòng không thanh toán lại và liên hệ hỗ trợ.", terminal: true };
  switch (payment.status) {
    case "Succeeded": return { tone: "success", title: "Thanh toán thành công", detail: "BonBon đã ghi nhận thanh toán. Bạn có thể xem trạng thái chuyến trong Chuyến của tôi.", terminal: true };
    case "Failed": return { tone: "error", title: "Thanh toán không thành công", detail: "BonBon đã ghi nhận kết quả thất bại. Trang này không tự tạo giao dịch mới.", terminal: true };
    case "Cancelled": return { tone: "error", title: "Giao dịch đã hủy", detail: "BonBon đã ghi nhận giao dịch bị hủy. Không có yêu cầu thanh toán mới được tạo trên trang này.", terminal: true };
    case "Processing": return { tone: "waiting", title: "Đang xử lý thanh toán", detail: "Giao dịch đang được xử lý. Vui lòng chờ xác minh và không thanh toán lại.", terminal: false };
    case "Pending": return { tone: "waiting", title: "Chờ xác minh thanh toán", detail: "BonBon chưa có xác nhận thanh toán thành công. Kết quả trên trình duyệt không thay thế xác nhận từ hệ thống.", terminal: false };
  }
}
