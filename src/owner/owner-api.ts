import type { AuthSession } from "../auth/auth-api";

const API_BASE_URL = (import.meta.env?.VITE_API_URL || "/api").replace(/\/$/, "");

export interface VehicleRegistrationPayload {
  plateNumber: string;
  brand: string;
  model: string;
  productionYear: number;
  seats: number;
  transmission: string;
  fuelType: string;
  bodyType: string;
  description: string;
  pickupAddress: string;
  hourPrice: number;
  dayPrice: number;
  weeklyDiscountEnabled: boolean;
  weeklyDiscountPercent: number | null;
  mileageLimitEnabled: boolean;
  dailyMileageLimitKm: number | null;
  overageFeePerKm: number | null;
  rentalTerms: string | null;
  features: string[];
}

export interface VehicleRegistrationResult {
  vehicleId: string;
  status: string;
  imageCount: number;
}

export interface RejectedRegistration extends VehicleRegistrationPayload {
  vehicleId: string; rejectionReason: string | null; imageUrls: string[];
}

export async function getRejectedRegistration(session: AuthSession, vehicleId: string) {
  const item = await bookingRequest<RejectedRegistration>(session, `/vehicles/registrations/${encodeURIComponent(vehicleId)}/rejected`);
  return { ...item, imageUrls: item.imageUrls.map(url => ownerImageUrl(url) ?? url) };
}

export interface OwnerVehicle {
  vehicleId: string; brand: string; model: string; plateNumber: string; status: string;
  rejectionReason: string | null; imageCount: number; productionYear: number | null;
  seats: number; transmission: string; bodyType: string; pickupAddress: string;
  hourPrice: number; dayPrice: number; coverImageUrl: string | null;
}
export interface OwnerBlock { blockId: string; vehicleId: string; startAt: string; endAt: string; reason: string | null }

export function ownerImageUrl(value: string | null) {
  return value?.startsWith("/api/") ? API_BASE_URL.replace(/\/api$/, "") + value : value;
}

export interface OwnerBooking {
  bookingId: string;
  vehicleId: string;
  vehicleName: string;
  plateNumber: string;
  coverImageUrl: string | null;
  customerName: string;
  customerPhone: string | null;
  rentalType: "Hourly" | "Daily";
  startAt: string;
  endAt: string;
  totalAmount: number;
  currency: string;
  status: string;
  createdAt: string;
}

export interface BookingDecisionResult {
  bookingId: string;
  status: string;
  unitPrice: number;
  quotedRentalAmount: number;
  currency: string;
  isReplay: boolean;
}

interface ProblemDetails { detail?: string; title?: string; errors?: Record<string, string[]> }

async function bookingRequest<T>(session: AuthSession, path: string, method: "GET" | "POST" = "GET", signal?: AbortSignal): Promise<T> {
  const timeout = AbortSignal.timeout(15000);
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: { Authorization: `Bearer ${session.accessToken}` },
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
  } catch (reason) {
    if (signal?.aborted) throw reason;
    const message = timeout.aborted ? "Máy chủ phản hồi quá lâu." : "Không kết nối được tới BonBon.";
    throw new Error(`${message}${method === "POST" ? " Hãy cập nhật lại đơn trước khi thử lại." : " Vui lòng thử lại."}`);
  }
  if (!response.ok) {
    const problem = await response.json().catch(() => null) as ProblemDetails | null;
    const validation = problem?.errors ? Object.values(problem.errors).flat().find(Boolean) : undefined;
    throw new Error(validation || problem?.detail || problem?.title || (response.status === 401 ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
      : response.status === 403 ? "Tài khoản chưa có quyền chủ xe hợp lệ. Vui lòng đăng nhập lại sau khi xe được duyệt."
      : "Không thể tải dữ liệu quản lý xe."));
  }
  return response.json() as Promise<T>;
}

export function getOwnerBookings(session: AuthSession, signal?: AbortSignal) {
  return bookingRequest<OwnerBooking[]>(session, "/bookings/owner", "GET", signal).then(items => items.map(item => ({
    ...item,
    coverImageUrl: ownerImageUrl(item.coverImageUrl),
  })));
}

export async function getOwnerVehicles(session: AuthSession, signal?: AbortSignal) {
  const items = await bookingRequest<OwnerVehicle[]>(session, "/vehicles/mine", "GET", signal);
  return items.map(item => ({ ...item, coverImageUrl: ownerImageUrl(item.coverImageUrl) }));
}

export function getOwnerBlocks(session: AuthSession, startAt: string, endAt: string, signal?: AbortSignal) {
  return bookingRequest<OwnerBlock[]>(session, `/vehicles/owner-blocks?${new URLSearchParams({ startAt, endAt })}`, "GET", signal);
}

export function approveBooking(session: AuthSession, bookingId: string) {
  return bookingRequest<BookingDecisionResult>(session, `/bookings/${encodeURIComponent(bookingId)}/approve`, "POST");
}

export function rejectBooking(session: AuthSession, bookingId: string) {
  return bookingRequest<BookingDecisionResult>(session, `/bookings/${encodeURIComponent(bookingId)}/reject`, "POST");
}

export async function registerVehicle(
  session: AuthSession,
  payload: VehicleRegistrationPayload,
  vehicleImages: File[],
  rejectedVehicleId?: string,
) {
  const body = new FormData();
  body.append("metadata", JSON.stringify(payload));
  vehicleImages.forEach((image) => body.append("vehicleImages", image));

  const path = rejectedVehicleId ? `/vehicles/registrations/${encodeURIComponent(rejectedVehicleId)}/resubmit` : "/vehicles/registrations";
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.accessToken}` },
    body,
  });

  if (!response.ok) {
    const problem = await response.json().catch(() => null) as { detail?: string; title?: string } | null;
    throw new Error(problem?.detail || "Không thể gửi đăng ký xe. Vui lòng thử lại.");
  }
  return response.json() as Promise<VehicleRegistrationResult>;
}
