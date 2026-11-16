/** Rental inputs represent Vietnam local time regardless of the browser timezone. */
export const RENTAL_TIME_OPTIONS = Array.from({ length: 48 }, (_, index) =>
  `${String(Math.floor(index / 2)).padStart(2, "0")}:${index % 2 ? "30" : "00"}`);

export function vietnamDateKey(now: number) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(now));
}

export function isFutureRentalSlot(date: string, time: string, now: number) {
  const instant = Date.parse(`${date}T${time}:00+07:00`);
  return Number.isFinite(instant) && instant > now;
}

/** Hourly rentals may start at any half-hour slot and continue overnight. */
export function isValidHourlyRental(time: string, hours: number) {
  if (!/^\d{2}:\d{2}$/.test(time) || !Number.isInteger(hours) || hours < 4 || hours > 8) return false;
  const [hour, minute] = time.split(":").map(Number);
  return hour >= 0 && hour <= 23 && (minute === 0 || minute === 30);
}

export const HOURLY_PICKUP_OPTIONS = RENTAL_TIME_OPTIONS;

export function firstFutureRentalTime(date: string, now: number) {
  return HOURLY_PICKUP_OPTIONS.find(time => isFutureRentalSlot(date, time, now)) ?? null;
}
