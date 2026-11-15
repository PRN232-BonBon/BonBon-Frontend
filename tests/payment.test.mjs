import test from "node:test";
import assert from "node:assert/strict";
import { canPayBooking, bookingStatusLabel } from "../src/booking/booking-status.ts";
import { createPayment, getPaymentStatus, safeCheckoutUrl, verifiedPaymentSucceeded } from "../src/payment/payment-api.ts";
import { getBookingDetail } from "../src/portal/portal-api.ts";

const future = "2099-01-01T00:00:00Z";
const session = id => ({ accessToken: "test-token", account: { accountId: id } });
for (const status of ["PendingApproval", "Confirmed", "ReadyForPickup", "InProgress", "Returned", "Completed", "Cancelled", "Rejected", "unknown"]) {
  test(`${status} never enables a new payment`, () => assert.equal(canPayBooking({ status, startAt: future }), false));
}
test("approval, future pickup and payment state are all required", () => {
  assert.equal(canPayBooking({ status: "AwaitingPayment", startAt: future }), true);
  assert.equal(canPayBooking({ status: "AwaitingPayment", startAt: "2000-01-01" }), false);
  assert.equal(canPayBooking({ status: "AwaitingPayment", startAt: "invalid" }), false);
  assert.equal(bookingStatusLabel("PendingApproval"), "Chờ xác nhận");
  assert.equal(bookingStatusLabel("AwaitingPayment"), "Chờ thanh toán");
  assert.equal(bookingStatusLabel("Confirmed"), "Đã thanh toán");
});

for (const url of ["javascript:alert(1)", "http://sandbox.vnpayment.vn/paymentv2/vpcpay.html", "https://sandbox.vnpayment.vn.attacker.test/paymentv2/vpcpay.html", "https://user:password@sandbox.vnpayment.vn/paymentv2/vpcpay.html", "https://sandbox.vnpayment.vn:444/paymentv2/vpcpay.html", "https://sandbox.vnpayment.vn/other"]) {
  test(`reject untrusted checkout: ${url}`, () => assert.equal(safeCheckoutUrl(url), null));
}
test("accept the unchanged signed checkout URL only", () => {
  const value = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_TxnRef=ABC&vnp_SecureHash=test";
  assert.equal(safeCheckoutUrl(value), value);
});
test("success requires the backend receipt with no reconciliation flag", () => {
  assert.equal(verifiedPaymentSucceeded({ status: "Pending", requiresReconciliation: false }), false);
  assert.equal(verifiedPaymentSucceeded({ status: "Succeeded", requiresReconciliation: true }), false);
  assert.equal(verifiedPaymentSucceeded({ status: "Succeeded", requiresReconciliation: false }), true);
  assert.equal(verifiedPaymentSucceeded(null), false);
});
test("concurrent checkout opens issue only one POST with no client amount or status", async context => {
  let calls = 0;
  context.mock.method(globalThis, "fetch", async (url, init) => {
    calls++; assert.equal(url, "/api/payments");
    assert.deepEqual(JSON.parse(init.body), { bookingId: "order-concurrent" });
    assert.equal(init.headers.Authorization, "Bearer test-token");
    assert.match(init.headers["Idempotency-Key"], /^[a-f\d-]{36}$/);
    return Response.json({ paymentId: "receipt-1" });
  });
  const account = session("account-concurrent");
  await Promise.all([createPayment("order-concurrent", account), createPayment("order-concurrent", account)]);
  assert.equal(calls, 1);
});
test("uncertain network retry preserves the original idempotency key", async context => {
  const keys = [];
  context.mock.method(globalThis, "fetch", async (_, init) => {
    keys.push(init.headers["Idempotency-Key"]);
    if (keys.length === 1) throw new TypeError("network failed after sending");
    return Response.json({ paymentId: "receipt-replayed" });
  });
  const account = session("account-retry");
  await assert.rejects(createPayment("order-retry", account));
  await createPayment("order-retry", account);
  assert.equal(keys.length, 2); assert.equal(keys[0], keys[1]);
});
test("payment status is authenticated and read-only", async context => {
  context.mock.method(globalThis, "fetch", async (url, init) => {
    assert.equal(url, "/api/payments/receipt-1");
    assert.equal(init.method, undefined); assert.equal(init.body, undefined);
    assert.equal(init.headers.Authorization, "Bearer test-token");
    return Response.json({ paymentId: "receipt-1", status: "Pending", requiresReconciliation: false });
  });
  assert.equal((await getPaymentStatus("receipt-1", session("account-status"))).status, "Pending");
});
test("order details load the saved snapshot, not a new quote", async context => {
  context.mock.method(globalThis, "fetch", async (url, init) => {
    assert.equal(url, "/api/bookings/order-1"); assert.equal(init.body, undefined);
    return Response.json({ bookingId: "order-1", quotedRentalAmount: 5000, vehicle: { coverImageUrl: "/api/vehicles/images/image-1" } });
  });
  const detail = await getBookingDetail("order-1", session("account-detail"));
  assert.equal(detail.quotedRentalAmount, 5000);
});
