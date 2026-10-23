import type { AuthSession } from "../../auth/auth-api";
import type { CustomerBooking } from "../../portal/portal-api";
import type { PaymentCheckoutResponse, PaymentStatusResponse } from "../payment-types";

export const accountId = "10000000-0000-0000-0000-000000000001";
export const bookingId = "20000000-0000-0000-0000-000000000001";
export const paymentId = "30000000-0000-0000-0000-000000000001";
export const session: AuthSession = { accessToken: "test-only-jwt", refreshToken: "test-only-refresh", accessTokenExpiresAt: 9999999999,
  account: { accountId, email: "test@example.invalid", fullName: "Khách thử nghiệm", displayName: null, roles: ["Customer"] } };
export const booking: CustomerBooking = { bookingId, vehicleName: "Toyota Vios", plateNumber: "TEST-001", coverImageUrl: null,
  rentalType: "Daily", startAt: "2035-01-01T02:00:00Z", endAt: "2035-01-03T02:00:00Z", totalAmount: 1300000,
  currency: "VND", status: "AwaitingPayment", createdAt: "2034-12-01T00:00:00Z" };
export const checkout: PaymentCheckoutResponse = { paymentId, bookingId, amount: 1300000, currency: "VND", status: "Pending",
  checkoutUrl: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Command=pay&vnp_TxnRef=test",
  expiresAt: "2035-01-01T01:00:00Z", isReplay: false };
export const status: PaymentStatusResponse = { paymentId, bookingId, amount: 1300000, currency: "VND", status: "Pending",
  expiresAt: checkout.expiresAt, requiresReconciliation: false };
export const json = (body: unknown, code = 200) => new Response(JSON.stringify(body), { status: code, headers: { "Content-Type": "application/json" } });
