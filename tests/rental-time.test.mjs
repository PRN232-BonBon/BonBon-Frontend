import test from "node:test";
import assert from "node:assert/strict";
import { firstFutureRentalTime, HOURLY_PICKUP_OPTIONS, isFutureRentalSlot, isHourlyRentalWithinHours, RENTAL_TIME_OPTIONS, vietnamDateKey } from "../src/booking/rental-time.ts";

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
  assert.equal(firstFutureRentalTime("2026-11-17", late), "05:00");
});

test("hourly rentals stay between 05:00 and 22:00 including 4–8 hour duration", () => {
  assert.equal(isHourlyRentalWithinHours("04:30", 4), false);
  assert.equal(isHourlyRentalWithinHours("05:00", 4), true);
  assert.equal(isHourlyRentalWithinHours("14:00", 8), true);
  assert.equal(isHourlyRentalWithinHours("14:30", 8), false);
  assert.equal(isHourlyRentalWithinHours("18:00", 4), true);
  assert.equal(isHourlyRentalWithinHours("18:30", 4), false);
  assert.equal(isHourlyRentalWithinHours("22:00", 4), false);
  assert.equal(HOURLY_PICKUP_OPTIONS[0], "05:00");
  assert.equal(HOURLY_PICKUP_OPTIONS.at(-1), "18:00");
});

test("late afternoon moves the default to the next morning", () => {
  const afterLastPickup = Date.parse("2026-11-16T11:00:00Z"); // 18:00 Vietnam
  assert.equal(firstFutureRentalTime("2026-11-16", afterLastPickup), null);
  assert.equal(firstFutureRentalTime("2026-11-17", afterLastPickup), "05:00");
});
