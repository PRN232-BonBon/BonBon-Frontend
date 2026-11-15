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
export class BookingRequestError extends Error {
  readonly code?: string;
  constructor(message: string, code?: string) { super(message); this.code = code; }
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

export interface OccupiedInterval { startAt: string; endAt: string }

export async function getOccupiedIntervals(vehicleId: string, startAt: string, endAt: string, signal?: AbortSignal): Promise<OccupiedInterval[]> {
  const query = new URLSearchParams({ startAt, endAt });
  const response = await fetch(`${API_BASE_URL}/vehicles/${encodeURIComponent(vehicleId)}/occupied-intervals?${query}`, { signal });
  if (!response.ok) throw new Error("Không thể tải lịch xe. Vui lòng thử lại.");
  return response.json() as Promise<OccupiedInterval[]>;
}

export async function checkVehicleAvailability(vehicleId: string, payload: RentalWindowPayload): Promise<boolean> {
  const query = new URLSearchParams({ ...payload });
  const response = await fetch(`${API_BASE_URL}/vehicles/${encodeURIComponent(vehicleId)}/availability?${query}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Không thể kiểm tra lịch xe. Vui lòng thử lại.");
  return ((await response.json()) as { isAvailable: boolean }).isAvailable;
}

export async function getBookingQuote(vehicleId: string, payload: RentalWindowPayload, signal?: AbortSignal): Promise<BookingQuote> {
  const response = await fetch(`${API_BASE_URL}/bookings/price-estimates`, {
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
  const response = await fetch(`${API_BASE_URL}/rentals/time-validations`, {
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

export async function createBooking(vehicleId: string, payload: RentalWindowPayload, accessToken: string, expectedQuote: BookingQuote) {
  const response = await fetch(`${API_BASE_URL}/bookings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ vehicleId, ...payload, expectedQuote: {
      billableUnits: expectedQuote.billableUnits, unitPrice: expectedQuote.unitPrice,
      weeklyDiscountPercent: expectedQuote.weeklyDiscountPercent, discountAmount: expectedQuote.discountAmount,
      quotedRentalAmount: expectedQuote.quotedRentalAmount, includedMileageKm: expectedQuote.includedMileageKm,
      overageFeePerKm: expectedQuote.overageFeePerKm, rentalTerms: expectedQuote.rentalTerms,
    } }),
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
    throw new BookingRequestError(validationMessage ?? problem?.detail ?? "Không thể tạo chuyến thuê xe.", problem?.title);
  }

  return response.json() as Promise<BookingResponse>;
}
