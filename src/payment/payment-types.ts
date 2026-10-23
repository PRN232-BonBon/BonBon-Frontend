// Exact camelCase JSON DTOs from BonBon.Business.DTOs.Payments.
export type PaymentStatus = "Pending" | "Processing" | "Succeeded" | "Failed" | "Cancelled";

export interface CreatePaymentRequest { bookingId: string }
export interface PaymentCheckoutResponse {
  paymentId: string;
  bookingId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  checkoutUrl: string | null;
  expiresAt: string;
  isReplay: boolean;
}
export interface PaymentStatusResponse {
  paymentId: string;
  bookingId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  expiresAt: string;
  requiresReconciliation: boolean;
}
export interface PaymentReturnResponse {
  paymentId: string;
  status: PaymentStatus;
  requiresReconciliation: boolean;
  message: string;
}
