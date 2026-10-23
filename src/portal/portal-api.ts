import type { AuthSession } from "../auth/auth-api";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

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

export function getMyBookings(session: AuthSession, signal?: AbortSignal) {
  return api<CustomerBooking[]>("/bookings/mine", session, { signal });
}

export function changePassword(session: AuthSession, currentPassword: string, newPassword: string) {
  return api<void>("/auth/change-password", session, {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}
