// Loopback-only UI fixtures. Not imported by the application or deployed.
import { createServer } from "node:http";
let scenario = "normal";
let decisionCalls = 0;
const owner = { ownerId: "10000000-0000-0000-0000-000000000001", fullName: "Chủ xe kiểm thử", email: "owner@example.test", phone: null };
const session = { accessToken: "local-owner-fixture-not-a-credential", refreshToken: "local-fixture-refresh", accessTokenExpiresAt: Math.floor(Date.now() / 1000) + 7200,
  account: { accountId: owner.ownerId, fullName: owner.fullName, displayName: owner.fullName, email: owner.email, roles: ["Customer", "VehicleOwner"] } };
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const date = (offset, hour = "09") => `${new Date(Date.parse(`${today}T00:00:00Z`) + offset * 86400000).toISOString().slice(0, 10)}T${hour}:00:00+07:00`;
const vehicles = [
  { vehicleId: "20000000-0000-0000-0000-000000000003", brand: "Toyota", model: "Vios", productionYear: 2026, status: "Available", plateNumber: "TEST-001", dayPrice: 679000, hourPrice: 120000, imageCount: 5, coverImageUrl: "/assets/cars/toyota-vios-2026-1.webp", rejectionReason: null, seats: 5, transmission: "Automatic", bodyType: "Sedan", pickupAddress: "Phường 15, Quận Bình Thạnh, TP. Hồ Chí Minh" },
  { vehicleId: "20000000-0000-0000-0000-000000000004", brand: "VinFast", model: "VF 3", productionYear: 2026, status: "PendingApproval", plateNumber: "TEST-002", dayPrice: 555000, hourPrice: 100000, imageCount: 4, coverImageUrl: "/assets/cars/vinfast-vf3-2026-1.webp", rejectionReason: null, seats: 4, transmission: "Automatic", bodyType: "Mini SUV", pickupAddress: "Phường Bến Thành, Quận 1, TP. Hồ Chí Minh" },
  { vehicleId: "20000000-0000-0000-0000-000000000001", brand: "Hyundai", model: "Accent", productionYear: 2024, status: "Rejected", plateNumber: "TEST-003", dayPrice: 761000, hourPrice: 130000, imageCount: 3, coverImageUrl: "/assets/cars/hyundai-accent-2024-1.webp", rejectionReason: "Ảnh xe chưa rõ. Vui lòng kiểm tra thông tin trước khi đăng ký lại.", seats: 5, transmission: "Automatic", bodyType: "Sedan", pickupAddress: "Phường An Phú, TP. Thủ Đức, TP. Hồ Chí Minh" },
];
const bookings = ["PendingApproval", "InProgress", "AwaitingPayment"].map((status, index) => ({ bookingId: `80000000-0000-0000-0000-00000000000${index + 1}`,
  vehicleId: vehicles[0].vehicleId, vehicleName: "Toyota Vios 2026", plateNumber: "TEST-001", coverImageUrl: vehicles[0].coverImageUrl,
  customerName: ["Khách kiểm thử A", "Khách kiểm thử B", "Khách kiểm thử C"][index], customerPhone: null,
  startAt: date(index + 1), endAt: date(index + 2), totalAmount: 679000, currency: "VND", rentalType: "Daily", status, createdAt: date(0),
}));
const blocks = [{ blockId: "60000000-0000-0000-0000-000000000001", vehicleId: vehicles[0].vehicleId, startAt: date(6, "00"), endAt: date(7, "00"), reason: "Lịch bảo dưỡng kiểm thử" }];
function detail(booking) { return { ...booking, billableUnits: 1, unitPrice: 679000, baseRentalAmount: 679000, weeklyDiscountPercent: 0, discountAmount: 0,
  quotedRentalAmount: 679000, includedMileageKm: 400, overageFeePerKm: 3000, rentalTerms: "Dữ liệu kiểm thử local, không phải đơn thuê xe thực tế.",
  vehicle: { ...vehicles[0], fuelType: "Gasoline" }, owner, customer: { customerId: "90000000-0000-0000-0000-000000000001", fullName: booking.customerName, email: "customer@example.test", phone: null }, inspections: [], additionalCharges: [] }; }
createServer(async (request, response) => {
  if (request.headers.origin === "http://127.0.0.1:5175") response.setHeader("Access-Control-Allow-Origin", request.headers.origin);
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization"); response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS"); response.setHeader("Cache-Control", "no-store");
  if (request.method === "OPTIONS") return response.writeHead(204).end();
  const send = (code, data) => { response.writeHead(code, { "Content-Type": "application/json" }); response.end(JSON.stringify(data)); };
  try {
    let text = ""; for await (const chunk of request) text += chunk;
    const body = text ? JSON.parse(text) : {}; const url = new URL(request.url, "http://127.0.0.1:5198");
    if (url.pathname === "/__scenario") { scenario = body.scenario || "normal"; return send(200, { scenario }); }
    if (url.pathname === "/__state") return send(200, { scenario, decisionCalls, bookings });
    if (["/api/auth/login", "/api/auth/refresh"].includes(url.pathname)) return send(200, session);
    if (url.pathname === "/api/auth/logout") return send(200, {});
    if (scenario === "list-error" && ["/api/vehicles/mine", "/api/bookings/owner"].includes(url.pathname)) return send(503, { detail: "Không thể tải dữ liệu kiểm thử. Vui lòng thử lại." });
    if (url.pathname === "/api/vehicles/mine") return send(200, scenario === "empty" ? [] : vehicles);
    if (url.pathname === "/api/bookings/owner") return send(200, scenario === "empty" ? [] : bookings);
    if (url.pathname === "/api/vehicles/owner-blocks") return send(scenario === "blocks-error" ? 503 : 200, scenario === "blocks-error" ? { detail: "Chưa tải được lịch bận. Không thể xác định lịch trống." } : scenario === "empty" ? [] : blocks);
    // Synthetic read-only tracking preview; deliberately no live GPS or SignalR server.
    if (request.method === "GET" && url.pathname.endsWith("/tracking/status")) {
      const booking = bookings.find(item => item.bookingId === url.pathname.split("/")[3]);
      if (!booking) return send(404, { detail: "Không có chuyến kiểm thử." });
      return send(200, { bookingId: booking.bookingId, viewerRole: "Owner", state: booking.status === "InProgress" ? "Ready" : "Inactive", canTrack: booking.status === "InProgress", deadline: booking.endAt, meetingPointsConfigured: true });
    }
    if (request.method === "GET" && url.pathname.endsWith("/tracking/snapshot")) return send(200, { bookingId: url.pathname.split("/")[3], latitude: 10.77, longitude: 106.7, accuracyMeters: 25, recordedAt: new Date().toISOString(), destinationLatitude: 10.78, destinationLongitude: 106.71, distanceMeters: 1560, arrived: false });
    if (url.pathname.startsWith("/api/bookings/")) {
      const id = url.pathname.split("/")[3]; const booking = bookings.find(item => item.bookingId === id);
      if (!booking) return send(404, { detail: "Không tìm thấy đơn kiểm thử." });
      if (request.method === "GET") return send(200, detail(booking));
      const action = url.pathname.split("/")[4];
      if (request.method === "POST" && ["approve", "reject"].includes(action)) {
        decisionCalls++;
        if (scenario === "decision-error") return send(409, { detail: "Xe vừa có lịch thuê trùng. Vui lòng cập nhật lại." });
        if (booking.status !== "PendingApproval") return send(409, { detail: "Đơn đã được xử lý." });
        booking.status = action === "approve" ? "AwaitingPayment" : "Rejected";
        return send(200, { bookingId: id, status: booking.status, unitPrice: 679000, quotedRentalAmount: 679000, currency: "VND", isReplay: false });
      }
    }
    return send(404, { detail: "Local owner fixture endpoint not found." });
  } catch { send(400, { detail: "Invalid local fixture request." }); }
}).listen(5198, "127.0.0.1", () => console.log("Local-only owner UI fixture: http://127.0.0.1:5198"));
