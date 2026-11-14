import type { AuthSession } from "../auth/auth-api";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

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

interface ProblemDetails { detail?: string; title?: string; }

async function bookingRequest<T>(session: AuthSession, path: string, method: "GET" | "POST" = "GET", signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${session.accessToken}` },
    signal,
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => null) as ProblemDetails | null;
    throw new Error(problem?.detail || problem?.title || "Không thể tải yêu cầu thuê xe.");
  }
  return response.json() as Promise<T>;
}

export function getOwnerBookings(session: AuthSession, signal?: AbortSignal) {
  return bookingRequest<OwnerBooking[]>(session, "/bookings/owner", "GET", signal).then(items => items.map(item => ({
    ...item,
    coverImageUrl: item.coverImageUrl?.startsWith("/api/")
      ? `${API_BASE_URL.replace(/\/api$/, "")}${item.coverImageUrl}`
      : item.coverImageUrl,
  })));
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
) {
  const body = new FormData();
  body.append("metadata", JSON.stringify(payload));
  vehicleImages.forEach((image) => body.append("vehicleImages", image));

  const response = await fetch(`${API_BASE_URL}/vehicles/registrations`, {
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
