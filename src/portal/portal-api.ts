import type { AuthSession } from "../auth/auth-api";

const API_BASE_URL = (import.meta.env?.VITE_API_URL || "/api").replace(/\/$/, "");

export function resolveBookingImage(url: string | null) {
  return url?.startsWith("/api/") ? `${API_BASE_URL.replace(/\/api$/, "")}${url}` : url;
}

export interface CustomerBooking {
  bookingId: string;
  vehicleName: string;
  plateNumber: string;
  coverImageUrl: string | null;
  rentalType: "Hourly" | "Daily";
  startAt: string;
  endAt: string;
  totalAmount: number;
  currency: string;
  status: string;
  createdAt: string;
}

export interface BookingDetail {
  bookingId: string; status: string; rentalType: "Hourly" | "Daily"; startAt: string; endAt: string;
  billableUnits: number; unitPrice: number; baseRentalAmount: number; weeklyDiscountPercent: number;
  discountAmount: number; quotedRentalAmount: number; includedMileageKm: number | null;
  overageFeePerKm: number | null; rentalTerms: string | null; currency: string; createdAt: string;
  vehicle: { vehicleId: string; brand: string; model: string; plateNumber: string; coverImageUrl: string | null;
    pickupAddress: string; seats: number; transmission: string; fuelType: string };
  customer: { customerId: string; fullName: string; email: string; phone: string | null };
  owner: { ownerId: string; fullName: string; email: string; phone: string | null };
  inspections: { kind: "Pickup" | "Return"; odometerKm: number | null; fuelLevel: number | null; conditionNotes: string | null }[];
  additionalCharges: { additionalChargeId: string; reasonCode: string; description: string; amount: number; currency: string; status: string }[];
}

async function api<T>(path: string, session: AuthSession, init?: RequestInit) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.accessToken}`,
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => null) as { detail?: string; title?: string } | null;
    throw new Error(problem?.detail || problem?.title || "Không thể kết nối đến BonBon.");
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}

export async function getMyBookings(session: AuthSession, signal?: AbortSignal) {
  const items = await api<CustomerBooking[]>("/bookings?participantRole=customer", session, { signal });
  return items.map(item => ({ ...item, coverImageUrl: resolveBookingImage(item.coverImageUrl) }));
}

export async function getBookingDetail(bookingId: string, session: AuthSession, signal?: AbortSignal) {
  const detail = await api<BookingDetail>(`/bookings/${encodeURIComponent(bookingId)}`, session, { signal });
  return { ...detail, vehicle: { ...detail.vehicle, coverImageUrl: resolveBookingImage(detail.vehicle.coverImageUrl) } };
}

export async function cancelBooking(bookingId: string, session: AuthSession): Promise<{ message: string }> {
  return api<{ message: string }>(`/bookings/${encodeURIComponent(bookingId)}/cancel`, session, { method: "POST" });
}

export interface PickupInspection {
  odometerKm: number;
  fuelLevel?: number;
  conditionNotes?: string;
}

export async function confirmPickup(bookingId: string, session: AuthSession, inspection: PickupInspection): Promise<void> {
  await api<unknown>(`/bookings/${encodeURIComponent(bookingId)}/pickup`, session, {
    method: "POST",
    body: JSON.stringify(inspection),
  });
}

// ---------------------------------------------------------------------------
// Hồ sơ tài khoản
// ---------------------------------------------------------------------------

export interface AccountProfile {
  accountId: string;
  email: string;
  fullName: string;
  displayName: string | null;
  phone: string | null;
  status: string;
  createdAt: string;
  roles: string[];
  /** Tài khoản Google-only không có mật khẩu local. */
  hasPassword: boolean;
}

export function getProfile(session: AuthSession) {
  return api<AccountProfile>("/auth/profile", session);
}

export function updateProfile(
  session: AuthSession,
  payload: { displayName: string | null; phone: string | null },
) {
  return api<AccountProfile>("/auth/profile", session, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function changePassword(session: AuthSession, currentPassword: string, newPassword: string) {
  return api<void>("/auth/change-password", session, {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}
