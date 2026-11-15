import test from "node:test";
import assert from "node:assert/strict";
import { addDay, mondayOfWeek, vietnamDay, calendarWindow, overlapsDay, bookingsOnDay, blocksOnDay, matchesOwnerVehicle, canDecideOwnerBooking, calendarBookingTone, ownerPortalAssets } from "../src/owner/owner-portal-model.ts";
import { getOwnerVehicles, getOwnerBookings, getOwnerBlocks, approveBooking, rejectBooking } from "../src/owner/owner-api.ts";

test("calendar uses Vietnam dates independently of browser timezone", () => {
  assert.equal(vietnamDay("2026-11-05T18:00:00Z"), "2026-11-06");
  assert.equal(mondayOfWeek("2026-11-05"), "2026-11-02");
  assert.equal(mondayOfWeek("2026-11-08"), "2026-11-02");
  assert.equal(addDay("2026-12-31", 1), "2027-01-01");
  assert.deepEqual(calendarWindow("2026-11-02"), { startAt: "2026-11-02T00:00:00+07:00", endAt: "2026-11-16T00:00:00+07:00" });
});
test("half-open boundaries do not occupy the day after midnight return", () => {
  const item = { startAt: "2026-11-05T09:00:00+07:00", endAt: "2026-11-06T00:00:00+07:00" };
  assert.equal(overlapsDay(item, "2026-11-05"), true);
  assert.equal(overlapsDay(item, "2026-11-06"), false);
});
test("hourly reservations on the same day are not collapsed or lost", () => {
  const item = { vehicleId: "a", status: "PendingApproval", startAt: "2026-11-05T09:00:00+07:00", endAt: "2026-11-05T13:00:00+07:00" };
  const bookings = [item, { ...item, status: "Rejected" }, { ...item, vehicleId: "b" }, { ...item, startAt: "2026-11-05T14:00:00+07:00", endAt: "2026-11-05T18:00:00+07:00" }];
  assert.equal(bookingsOnDay(bookings, "a", "2026-11-05").length, 2);
  assert.equal(blocksOnDay([item], "a", "2026-11-05").length, 1);
});
test("owner search supports Vietnamese names without accents", () => {
  assert.equal(matchesOwnerVehicle({ brand: "Toyota", model: "Xe Đỏ", plateNumber: "53X-32343" }, "xe do"), true);
  assert.equal(matchesOwnerVehicle({ brand: "Toyota", model: "Vios", plateNumber: "53X-32343" }, "32343"), true);
});
test("only future PendingApproval orders allow decisions", () => {
  assert.equal(canDecideOwnerBooking({ status: "PendingApproval", startAt: "2099-01-01" }), true);
  for (const status of ["AwaitingPayment", "Confirmed", "Rejected", "Cancelled", "unknown"]) assert.equal(canDecideOwnerBooking({ status, startAt: "2099-01-01" }), false);
  assert.equal(canDecideOwnerBooking({ status: "PendingApproval", startAt: "2000-01-01" }), false);
  assert.equal(calendarBookingTone("Rejected"), "inactive");
});
test("owner-specific asset names reuse optimized portal files", () => { assert.equal(ownerPortalAssets.emptyLocation, "/assets/portal/empty-addresses.webp"); });
const session = { accessToken: "local-test", account: { accountId: "owner" } };
test("owner views use authenticated owner endpoints, not the public catalog", async context => {
  const seen = [];
  context.mock.method(globalThis, "fetch", async (url, init) => { seen.push(url); assert.equal(init.headers.Authorization, "Bearer local-test"); assert.equal(init.method, "GET"); assert.ok(init.signal); return Response.json([]); });
  await getOwnerVehicles(session); await getOwnerBookings(session); await getOwnerBlocks(session, "2026-11-02T00:00:00+07:00", "2026-11-16T00:00:00+07:00");
  assert.equal(seen[0], "/api/vehicles/mine"); assert.equal(seen[1], "/api/bookings/owner");
  const url = new URL(seen[2], "http://localhost"); assert.equal(url.searchParams.get("startAt"), "2026-11-02T00:00:00+07:00");
});
test("owner decisions send neither owner identity, price nor a chosen status", async context => {
  context.mock.method(globalThis, "fetch", async (url, init) => { assert.equal(url, "/api/bookings/order-1/approve"); assert.equal(init.method, "POST"); assert.equal(init.body, undefined); return Response.json({ status: "AwaitingPayment" }); });
  assert.equal((await approveBooking(session, "order-1")).status, "AwaitingPayment");
});
test("failed owner API does not turn into a fake empty list", async context => {
  context.mock.method(globalThis, "fetch", async () => Response.json({ detail: "Không đủ quyền" }, { status: 403 }));
  await assert.rejects(getOwnerVehicles(session), /Không đủ quyền/);
});

test("both owner decision endpoints encode IDs and never send client identity/price", async context => {
  let calls = 0;
  context.mock.method(globalThis, "fetch", async (url, init) => {
    calls++; assert.equal(url, "/api/bookings/a%2Fb/reject"); assert.equal(init.method, "POST");
    assert.equal(init.body, undefined); assert.equal(init.headers.Authorization, "Bearer local-test");
    return Response.json({ status: "Rejected" });
  });
  assert.equal((await rejectBooking(session, "a/b")).status, "Rejected");
  assert.equal(calls, 1);
});

test("owner API preserves caller cancellation and never retries an aborted request", async context => {
  const controller = new AbortController(); const reason = new DOMException("cancelled", "AbortError"); controller.abort(reason);
  let calls = 0;
  context.mock.method(globalThis, "fetch", async (_url, init) => { calls++; assert.equal(init.signal.aborted, true); throw init.signal.reason; });
  await assert.rejects(getOwnerBookings(session, controller.signal), error => error === reason);
  assert.equal(calls, 1);
});

test("uncertain owner POST does not retry and advises refreshing before another decision", async context => {
  let calls = 0;
  context.mock.method(globalThis, "fetch", async () => { calls++; throw new TypeError("network"); });
  await assert.rejects(approveBooking(session, "a"), /cập nhật lại đơn trước khi thử lại/);
  assert.equal(calls, 1);
});

test("owner API exposes validation errors and handles empty authorization failures", async context => {
  context.mock.method(globalThis, "fetch", async () => Response.json({ errors: { startAt: ["Khoảng ngày không hợp lệ"] } }, { status: 400 }));
  await assert.rejects(getOwnerBookings(session), /Khoảng ngày không hợp lệ/);
  context.mock.method(globalThis, "fetch", async () => new Response(null, { status: 401 }));
  await assert.rejects(getOwnerBookings(session), /hết hạn/);
});

test("shared owner booking API keeps optimized and API image paths", async context => {
  context.mock.method(globalThis, "fetch", async () => Response.json([{ coverImageUrl: "/assets/cars/a.webp" }, { coverImageUrl: "/api/vehicles/images/a" }, { coverImageUrl: null }]));
  assert.deepEqual((await getOwnerBookings(session)).map(item => item.coverImageUrl), ["/assets/cars/a.webp", "/api/vehicles/images/a", null]);
});

test("owner API has a bounded request timeout", async context => {
  const controller = new AbortController();
  context.mock.method(AbortSignal, "timeout", milliseconds => { assert.equal(milliseconds, 15000); return controller.signal; });
  context.mock.method(globalThis, "fetch", async () => { controller.abort(new DOMException("timeout", "TimeoutError")); throw controller.signal.reason; });
  await assert.rejects(getOwnerBookings(session), /phản hồi quá lâu/);
});
