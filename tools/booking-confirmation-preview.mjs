// Local-only UI verification server. Never imported by or bundled with the application.
import { createServer } from "node:http";

let scenario = "available";
let quoteRequests = 0;
let bookingRequests = 0;
let createdBooking = null;
let paymentRequests = 0;
let checkout = null;
const sampleId = "90000000-0000-0000-0000-000000005000";
const customer = { customerId: "90000000-0000-0000-0000-000000000001", fullName: "Khách kiểm thử", email: "preview@example.test", phone: "" };
const id = "20000000-0000-0000-0000-000000000003";
const owner = { ownerId: "10000000-0000-0000-0000-000000000001", fullName: "Chủ xe kiểm thử BonBon" };
const vehicle = {
  id, brand: "Toyota", model: "Vios", year: 2026, bodyType: "Sedan", seats: 5, transmission: "Automatic", fuel: "Gasoline",
  pickupAddress: "Quận Bình Thạnh, TP. Hồ Chí Minh", imageUrl: "/assets/cars/toyota-vios-2026-1.webp",
  imageUrls: [1, 2, 3].map(index => `/assets/cars/toyota-vios-2026-${index}.webp`),
  description: "Dữ liệu kiểm thử giao diện local, không kết nối database production.", features: ["Bluetooth", "Camera lùi", "Khe cắm USB"],
  dayPrice: 679000, hourPrice: 120000, rating: 0, completedTrips: 0, depositFree: false, deliveryAvailable: false, instantBook: false,
  owner, weeklyDiscountEnabled: true, weeklyDiscountPercent: 10, mileageLimitEnabled: true, dailyMileageLimitKm: 400,
  overageFeePerKm: 3000, rentalTerms: "Sử dụng xe đúng mục đích. Giữ xe sạch sẽ và trả xe đúng giờ.",
};

function quote(payload) {
  const hours = (Date.parse(payload.endAt) - Date.parse(payload.startAt)) / 3600000;
  const billableUnits = payload.rentalType === "Hourly" ? Math.round(hours) : Math.ceil(hours / 24);
  const unitPrice = payload.rentalType === "Hourly" ? vehicle.hourPrice : vehicle.dayPrice;
  const baseRentalAmount = unitPrice * billableUnits;
  const weeklyDiscountPercent = payload.rentalType === "Daily" && billableUnits >= 7 ? 10 : 0;
  const discountAmount = Math.round(baseRentalAmount * weeklyDiscountPercent / 100);
  return { ...payload, billableUnits, unitPrice, baseRentalAmount, weeklyDiscountPercent, discountAmount,
    quotedRentalAmount: baseRentalAmount - discountAmount, includedMileageKm: 400 * (payload.rentalType === "Daily" ? billableUnits : 1),
    overageFeePerKm: 3000, rentalTerms: vehicle.rentalTerms, currency: "VND", isAvailable: scenario !== "unavailable" };
}

const fixtures = ["PendingApproval", "AwaitingPayment", "Confirmed"].map((status, index) => ({
  bookingId: `80000000-0000-0000-0000-00000000000${index + 2}`, vehicleId: sampleId,
  vehicleName: "Toyota Vios 2026 · TEST thanh toán 5K", plateNumber: "BONBON-PAYMENT-TEST", coverImageUrl: vehicle.imageUrl,
  status, rentalType: "Daily", startAt: "2027-02-10T02:00:00Z", endAt: "2027-02-11T02:00:00Z",
  billableUnits: 1, unitPrice: 5000, baseRentalAmount: 5000, weeklyDiscountPercent: 0, discountAmount: 0,
  quotedRentalAmount: 5000, totalAmount: 5000, includedMileageKm: null, overageFeePerKm: null,
  rentalTerms: "Xe mẫu chỉ dùng kiểm thử thanh toán, không phải xe cho thuê thực tế.", currency: "VND", createdAt: "2026-11-05T02:00:00Z",
}));
const detail = booking => ({ ...booking, customer, owner,
  vehicle: { vehicleId: booking.vehicleId, brand: "Toyota", model: "Vios 2026 · TEST thanh toán 5K", plateNumber: booking.plateNumber,
    coverImageUrl: booking.coverImageUrl, pickupAddress: vehicle.pickupAddress, seats: 5, transmission: "Automatic", fuelType: "Gasoline" } });

createServer(async (request, response) => {
  if (["http://127.0.0.1:5174", "http://localhost:5174"].includes(request.headers.origin))
    response.setHeader("Access-Control-Allow-Origin", request.headers.origin);
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Idempotency-Key");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.setHeader("Cache-Control", "no-store");
  if (request.method === "OPTIONS") { response.writeHead(204).end(); return; }
  const send = (status, data) => { response.writeHead(status, { "Content-Type": "application/json" }); response.end(JSON.stringify(data)); };
  try {
    let text = "";
    for await (const chunk of request) text += chunk;
    const body = text ? JSON.parse(text) : {};
    if (request.url === "/__state") return send(200, { scenario, quoteRequests, bookingRequests, paymentRequests });
    if (request.url === "/__scenario" && request.method === "POST") { scenario = body.scenario || "available"; return send(200, { scenario }); }
    if (request.url === "/api/vehicles") return send(200, [vehicle]);
    if (request.url === "/api/bookings/quote") {
      quoteRequests++;
      if (scenario === "quote-error") return send(503, { detail: "Không thể tải báo giá. Vui lòng thử lại." });
      if (scenario === "slow") await new Promise(resolve => setTimeout(resolve, 3000));
      return send(200, quote(body));
    }
    if (request.url === "/api/bookings/validate-window") return send(200, { ...body, billableUnits: quote(body).billableUnits, unitLabel: body.rentalType === "Hourly" ? "giờ" : "ngày" });
    if (["/api/auth/login", "/api/auth/refresh"].includes(request.url)) return send(200, {
      accessToken: "local-preview-token-not-a-credential", refreshToken: "local-preview-refresh-not-a-credential",
      accessTokenExpiresAt: Math.floor(Date.now() / 1000) + 3600,
      account: { accountId: "90000000-0000-0000-0000-000000000001", email: "preview@example.test", fullName: "Khách kiểm thử", displayName: "Khách kiểm thử", roles: ["Customer"] },
    });
    if (request.url === "/api/bookings" && request.method === "POST") {
      bookingRequests++;
      if (scenario === "submit-error") return send(409, { detail: "Xe vừa có người đặt. Vui lòng chọn thời gian khác." });
      createdBooking = { bookingId: "80000000-0000-0000-0000-000000000001", ...quote(body), vehicleName: "Toyota Vios 2026", plateNumber: "TEST", coverImageUrl: vehicle.imageUrl, status: "PendingApproval", createdAt: new Date().toISOString() };
      return send(201, createdBooking);
    }
    if (request.url === "/api/bookings/mine") return send(200, [...(createdBooking ? [{ ...createdBooking, totalAmount: createdBooking.quotedRentalAmount }] : []), ...fixtures]);
    if (request.url?.startsWith("/api/bookings/") && request.method === "GET") {
      const booking = fixtures.find(item => request.url.endsWith(item.bookingId));
      return booking ? send(200, detail(booking)) : send(404, { detail: "Không tìm thấy đơn kiểm thử." });
    }
    if (request.url === "/api/payments" && request.method === "POST") {
      paymentRequests++;
      const booking = fixtures.find(item => item.bookingId === body.bookingId);
      if (!booking || booking.status !== "AwaitingPayment") return send(409, { detail: "Đơn chưa đủ điều kiện thanh toán." });
      if (scenario === "payment-error") return send(503, { detail: "Cổng thanh toán tạm thời chưa sẵn sàng." });
      checkout ??= { paymentId: "70000000-0000-0000-0000-000000000001", bookingId: booking.bookingId, amount: 5000, currency: "VND", status: "Pending",
        // Deliberately non-payable fixture URL; never opens an actual merchant transaction.
        checkoutUrl: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?fixture=local-ui-only&vnp_Amount=500000", expiresAt: new Date(Date.now() + 15 * 60000).toISOString(), isReplay: false };
      return send(200, checkout);
    }
    if (request.url?.startsWith("/api/payments/") && request.method === "GET" && checkout) {
      if (scenario === "payment-status-error") return send(503, { detail: "Không thể kiểm tra kết quả. Vui lòng thử lại." });
      const status = scenario === "payment-paid" ? "Succeeded" : scenario === "payment-failed" ? "Failed" : "Pending";
      if (status === "Succeeded" && scenario !== "payment-reconciliation") fixtures[1].status = "Confirmed";
      return send(200, { ...checkout, checkoutUrl: undefined, status, requiresReconciliation: scenario === "payment-reconciliation" });
    }
    return send(404, { detail: "Local preview endpoint not found." });
  } catch { send(400, { detail: "Invalid local test request." }); }
}).listen(5199, "127.0.0.1", () => console.log("Local-only booking UI fixture: http://127.0.0.1:5199"));
