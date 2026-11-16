import test from "node:test";
import assert from "node:assert/strict";
import { firstFutureRentalTime, HOURLY_PICKUP_OPTIONS, isFutureRentalSlot, isValidHourlyRental, RENTAL_TIME_OPTIONS, vietnamDateKey } from "../src/booking/rental-time.ts";

test("hourly pickup slots must be strictly later than the current instant", () => {
  const now = Date.parse("2026-11-16T03:10:00Z"); // 10:10 in Vietnam
  assert.equal(vietnamDateKey(now), "2026-11-16");
  assert.equal(isFutureRentalSlot("2026-11-16", "10:00", now), false);
  assert.equal(firstFutureRentalTime("2026-11-16", now), "10:30");
  assert.equal(isFutureRentalSlot("2026-11-17", "00:00", now), true);
  assert.equal(isFutureRentalSlot("2026-11-15", "23:30", now), false);
  assert.equal(RENTAL_TIME_OPTIONS.length, 48);
});

test("at a slot boundary or the end of the day, the current slot is not offered", () => {
  const boundary = Date.parse("2026-11-16T03:30:00Z");
  assert.equal(firstFutureRentalTime("2026-11-16", boundary), "11:00");
  const late = Date.parse("2026-11-16T16:30:00Z"); // 23:30 in Vietnam
  assert.equal(firstFutureRentalTime("2026-11-16", late), null);
  assert.equal(firstFutureRentalTime("2026-11-17", late), "00:00");
});

test("hourly rentals can start any time and continue overnight, with a 4–8 hour duration", () => {
  for (const time of ["00:00", "04:30", "14:30", "18:30", "22:00", "23:30"]) {
    assert.equal(isValidHourlyRental(time, 4), true);
    assert.equal(isValidHourlyRental(time, 8), true);
  }
  assert.equal(isValidHourlyRental("23:30", 3), false);
  assert.equal(isValidHourlyRental("23:30", 9), false);
  assert.equal(isValidHourlyRental("24:00", 4), false);
  assert.equal(HOURLY_PICKUP_OPTIONS[0], "00:00");
  assert.equal(HOURLY_PICKUP_OPTIONS.at(-1), "23:30");
});

test("night-time bookings retain future slots and roll to midnight only after the last slot", () => {
  const night = Date.parse("2026-11-16T15:15:00Z"); // 22:15 Vietnam
  assert.equal(firstFutureRentalTime("2026-11-16", night), "22:30");
  const afterLastPickup = Date.parse("2026-11-16T16:30:00Z"); // 23:30 Vietnam
  assert.equal(firstFutureRentalTime("2026-11-16", afterLastPickup), null);
  assert.equal(firstFutureRentalTime("2026-11-17", afterLastPickup), "00:00");
});
