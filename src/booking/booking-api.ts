export type RentalType = "Daily" | "Hourly";

export interface RentalWindowPayload {
  rentalType: RentalType;
  startAt: string;
  endAt: string;
}

export interface RentalWindowResponse extends RentalWindowPayload {
  billableUnits: number;
  unitLabel: "ngày" | "giờ";
}

interface ProblemDetails {
  title?: string;
  detail?: string;
  errors?: Record<string, string[]>;
}

export interface BookingResponse {
  bookingId: string;
  status: string;
}

export interface BookingQuote extends RentalWindowPayload {
  vehicleId: string;
  billableUnits: number;
  unitPrice: number;
  baseRentalAmount: number;
  weeklyDiscountPercent: number;
  discountAmount: number;
  quotedRentalAmount: number;
  includedMileageKm: number | null;
  overageFeePerKm: number | null;
  rentalTerms: string | null;
  currency: string;
  isAvailable: boolean;
}

const API_BASE_URL = (import.meta.env?.VITE_API_URL || "/api").replace(/\/$/, "");

export async function getBookingQuote(vehicleId: string, payload: RentalWindowPayload, signal?: AbortSignal): Promise<BookingQuote> {
  const response = await fetch(`${API_BASE_URL}/bookings/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vehicleId, ...payload }),
    signal,
  });
  if (!response.ok) {
    let problem: ProblemDetails | null = null;
    try { problem = await response.json() as ProblemDetails; } catch { /* An upstream error may not contain JSON. */ }
    const validationMessage = problem?.errors ? Object.values(problem.errors).flat().find(Boolean) : undefined;
    throw new Error(validationMessage ?? problem?.detail ?? "Không thể tải báo giá. Vui lòng thử lại.");
  }
  return response.json() as Promise<BookingQuote>;
}

export async function validateRentalWindow(payload: RentalWindowPayload) {
  const response = await fetch(`${API_BASE_URL}/bookings/validate-window`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let problem: ProblemDetails | null = null;
    try {
      problem = await response.json() as ProblemDetails;
    } catch {
      // Keep the stable fallback below when the API is temporarily unavailable.
    }

    const validationMessage = problem?.errors
      ? Object.values(problem.errors).flat().find(Boolean)
      : undefined;
    throw new Error(validationMessage ?? problem?.detail ?? "Không thể kiểm tra thời gian thuê.");
  }

  return response.json() as Promise<RentalWindowResponse>;
}

export async function createBooking(vehicleId: string, payload: RentalWindowPayload, accessToken: string) {
  const response = await fetch(`${API_BASE_URL}/bookings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ vehicleId, ...payload }),
  });

  if (!response.ok) {
    let problem: ProblemDetails | null = null;
    try {
      problem = await response.json() as ProblemDetails;
    } catch {
      // Keep the stable fallback below when the API is temporarily unavailable.
    }
    const validationMessage = problem?.errors
      ? Object.values(problem.errors).flat().find(Boolean)
      : undefined;
    throw new Error(validationMessage ?? problem?.detail ?? "Không thể tạo chuyến thuê xe.");
  }

  return response.json() as Promise<BookingResponse>;
}
