const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh", weekday: "short", day: "2-digit", month: "2-digit", year: "numeric",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

export function formatBookingDate(iso: string) {
  const parts = dateFormatter.formatToParts(new Date(iso));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? "";
  const weekday = get("weekday").replace(/^Th(?:ứ)?\s*/u, "T").replace(/^Chủ [Nn]hật$/u, "CN");
  return `${get("hour")}:${get("minute")} ${weekday}, ${get("day")}/${get("month")}/${get("year")}`;
}

export function formatBookingMoney(amount: number) {
  return `${new Intl.NumberFormat("vi-VN").format(amount)}đ`;
}
