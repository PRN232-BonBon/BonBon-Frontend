import test from "node:test";
import assert from "node:assert/strict";
import { canConfirmPickup, canPayBooking, bookingStatusLabel } from "../src/booking/booking-status.ts";
import { createPayment, getPaymentStatus, isSafeCheckoutForm, verifiedPaymentSucceeded } from "../src/payment/payment-api.ts";
import { confirmPickup, getBookingDetail } from "../src/portal/portal-api.ts";

const future = "2099-01-01T00:00:00Z";
const session = id => ({ accessToken: "test-token", account: { accountId: id, roles: ["Customer"] } });
const bookingId="20000000-0000-0000-0000-000000000001", retryBookingId="20000000-0000-0000-0000-000000000002";
const receiptId="30000000-0000-0000-0000-000000000001";
const payment=(booking=bookingId)=>({paymentId:receiptId,bookingId:booking,amount:1300000,currency:"VND",status:"Pending",checkout:null,expiresAt:future,isReplay:false,requiresReconciliation:false});
const storage=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),clear:()=>map.clear()}};
Object.defineProperty(globalThis,"localStorage",{value:storage(),configurable:true});
Object.defineProperty(globalThis,"sessionStorage",{value:storage(),configurable:true});
test.beforeEach(()=>{localStorage.clear();sessionStorage.clear()});
test("only paid bookings awaiting handover can confirm pickup", () => {
  for (const status of ["Confirmed", "ReadyForPickup"]) assert.equal(canConfirmPickup(status), true);
  for (const status of ["PendingApproval", "AwaitingPayment", "InProgress", "Completed", "Cancelled"]) assert.equal(canConfirmPickup(status), false);
});
test("pickup submits the actual odometer with the customer session", async context => {
  context.mock.method(globalThis, "fetch", async (url, init) => {
    assert.equal(url, "/api/bookings/order%2F1/pickup");
    assert.equal(init.method, "POST");
    assert.equal(init.headers.Authorization, "Bearer test-token");
    assert.deepEqual(JSON.parse(init.body), { odometerKm: 15000 });
    return Response.json({ kind: "Pickup", odometerKm: 15000 });
  });
  await confirmPickup("order/1", session("customer"), { odometerKm: 15000 });
});
test("pickup surfaces backend errors instead of claiming success", async context => {
  context.mock.method(globalThis, "fetch", async () => Response.json({ detail: "Đơn không còn chờ nhận xe." }, { status: 400 }));
  await assert.rejects(confirmPickup("order-1", session("customer"), { odometerKm: 1 }), /Đơn không còn chờ nhận xe/);
});
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

test("checkout rejects an untrusted action", () => assert.equal(isSafeCheckoutForm({action:"https://evil.invalid", method:"POST", fields:[]}), false));
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
    assert.deepEqual(JSON.parse(init.body), { bookingId, provider: "SEPAY_SANDBOX" });
    assert.equal(init.headers.Authorization, "Bearer test-token");
    assert.match(init.headers["Idempotency-Key"], /^[a-f\d-]{36}$/);
    return Response.json(payment());
  });
  const account = session("account-concurrent");
  await Promise.all([createPayment(bookingId, account), createPayment(bookingId, account)]);
  assert.equal(calls, 1);
});
test("uncertain network retry preserves the original idempotency key", async context => {
  const keys = [];
  context.mock.method(globalThis, "fetch", async (_, init) => {
    keys.push(init.headers["Idempotency-Key"]);
    if (keys.length === 1) throw new TypeError("network failed after sending");
    return Response.json(payment(retryBookingId));
  });
  const account = session("account-retry");
  await assert.rejects(createPayment(retryBookingId, account));
  await createPayment(retryBookingId, account);
  assert.equal(keys.length, 2); assert.equal(keys[0], keys[1]);
});
test("payment status is authenticated and read-only", async context => {
  context.mock.method(globalThis, "fetch", async (url, init) => {
    assert.equal(url, `/api/payments/${receiptId}?provider=SEPAY_SANDBOX`);
    assert.equal(init.method, undefined); assert.equal(init.body, undefined);
    assert.equal(init.headers.Authorization, "Bearer test-token");
    return Response.json(payment());
  });
  assert.equal((await getPaymentStatus(receiptId, session("account-status"))).status, "Pending");
});
test("order details load the saved snapshot, not a new quote", async context => {
  context.mock.method(globalThis, "fetch", async (url, init) => {
    assert.equal(url, "/api/bookings/order-1"); assert.equal(init.body, undefined);
    return Response.json({ bookingId: "order-1", quotedRentalAmount: 5000, vehicle: { coverImageUrl: "/api/vehicles/images/image-1" } });
  });
  const detail = await getBookingDetail("order-1", session("account-detail"));
  assert.equal(detail.quotedRentalAmount, 5000);
});
