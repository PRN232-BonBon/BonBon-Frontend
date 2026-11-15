import test from "node:test";
import assert from "node:assert/strict";
import { checkVehicleAvailability, getBookingQuote, createBooking } from "../src/booking/booking-api.ts";
import { formatBookingDate, formatBookingMoney } from "../src/booking/booking-display.ts";

const windowPayload = { rentalType: "Daily", startAt: "2026-11-06T02:00:00.000Z", endAt: "2026-11-13T02:00:00.000Z" };
const expectedQuote = { billableUnits: 7, unitPrice: 700000, weeklyDiscountPercent: 10, discountAmount: 490000, quotedRentalAmount: 4410000, includedMileageKm: 2100, overageFeePerKm: 3000, rentalTerms: null };

test("availability sends the vehicle resource and all rental filters", async context => {
  context.mock.method(globalThis, "fetch", async (url, options) => {
    const parsed = new URL(url, "https://example.test");
    assert.equal(parsed.pathname, "/api/vehicles/vehicle-1/availability");
    for (const [key, value] of Object.entries(windowPayload)) assert.equal(parsed.searchParams.get(key), value);
    assert.equal(options.cache, "no-store");
    return Response.json({ isAvailable: true });
  });
  assert.equal(await checkVehicleAvailability("vehicle-1", windowPayload), true);
});

test("preview calls the quote endpoint only, never creates a booking", async context => {
  const signal = new AbortController().signal;
  let calls = 0;
  context.mock.method(globalThis, "fetch", async (url, options) => {
    calls++;
    assert.equal(url, "/api/bookings/price-estimates");
    assert.equal(options.method, "POST");
    assert.equal(options.signal, signal);
    assert.deepEqual(JSON.parse(options.body), { vehicleId: "vehicle-1", ...windowPayload });
    return Response.json({ vehicleId: "vehicle-1", isAvailable: true, discountAmount: 475300, quotedRentalAmount: 4277700 });
  });
  const result = await getBookingQuote("vehicle-1", windowPayload, signal);
  assert.equal(result.quotedRentalAmount, 4277700);
  assert.equal(calls, 1);
});

test("unavailable quote is not silently converted into an available one", async context => {
  context.mock.method(globalThis, "fetch", async () => Response.json({ isAvailable: false }));
  assert.equal((await getBookingQuote("vehicle-1", windowPayload)).isAvailable, false);
});

test("validation errors from quote are displayed instead of a fabricated price", async context => {
  context.mock.method(globalThis, "fetch", async () => Response.json({ detail: "Thời gian trả xe phải sau thời gian nhận xe." }, { status: 400 }));
  await assert.rejects(getBookingQuote("vehicle-1", windowPayload), /Thời gian trả xe/);
});

test("non-JSON upstream errors use a safe fallback", async context => {
  context.mock.method(globalThis, "fetch", async () => new Response("<html>Bad Gateway</html>", { status: 502 }));
  await assert.rejects(getBookingQuote("vehicle-1", windowPayload), /Không thể tải báo giá/);
});

test("aborted quote requests are not retried", async context => {
  let calls = 0;
  context.mock.method(globalThis, "fetch", async () => { calls++; throw new DOMException("aborted", "AbortError"); });
  await assert.rejects(getBookingQuote("vehicle-1", windowPayload), { name: "AbortError" });
  assert.equal(calls, 1);
});

test("final submit sends the displayed quote only as an expectation and identity via token", async context => {
  context.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "/api/bookings");
    assert.equal(options.headers.Authorization, "Bearer test-token");
    assert.deepEqual(JSON.parse(options.body), { vehicleId: "vehicle-1", ...windowPayload, expectedQuote });
    return Response.json({ bookingId: "booking-1", status: "AwaitingPayment" }, { status: 201 });
  });
  assert.equal((await createBooking("vehicle-1", windowPayload, "test-token", expectedQuote)).status, "AwaitingPayment");
});

test("failed submit exposes the server's actionable error", async context => {
  context.mock.method(globalThis, "fetch", async () => Response.json({ detail: "Xe vừa được đặt trong khoảng thời gian này." }, { status: 400 }));
  await assert.rejects(createBooking("vehicle-1", windowPayload, "test-token", expectedQuote), /Xe vừa được đặt/);
});

test("rental dates use Vietnam time including the next calendar day", () => {
  assert.equal(formatBookingDate("2026-11-05T18:30:00Z"), "01:30 T6, 06/11/2026");
  assert.equal(formatBookingDate("2026-11-08T02:00:00Z"), "09:00 CN, 08/11/2026");
});

test("VND amounts use Vietnamese separators", () => {
  assert.equal(formatBookingMoney(4277700), "4.277.700đ");
  assert.equal(formatBookingMoney(0), "0đ");
});
