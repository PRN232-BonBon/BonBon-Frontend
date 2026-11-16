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

/** Hourly bookings must start and finish within the same Vietnam local day. */
export function isHourlyRentalWithinHours(time: string, hours: number) {
  if (!/^\d{2}:\d{2}$/.test(time) || !Number.isInteger(hours) || hours < 4 || hours > 8) return false;
  const [hour, minute] = time.split(":").map(Number);
  if (minute !== 0 && minute !== 30) return false;
  const startMinutes = hour * 60 + minute;
  return startMinutes >= 5 * 60 && startMinutes + hours * 60 <= 22 * 60;
}

export const HOURLY_PICKUP_OPTIONS = RENTAL_TIME_OPTIONS.filter(time => isHourlyRentalWithinHours(time, 4));

export function firstFutureRentalTime(date: string, now: number) {
  return HOURLY_PICKUP_OPTIONS.find(time => isFutureRentalSlot(date, time, now)) ?? null;
}
