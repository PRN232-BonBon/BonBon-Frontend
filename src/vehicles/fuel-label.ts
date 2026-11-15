export function fuelLabel(value: string) {
  const labels: Record<string, string> = { Gasoline: "Xăng", Diesel: "Dầu diesel", Electric: "Điện", Hybrid: "Xăng và điện" };
  return labels[value] ?? "Chưa cập nhật";
}
