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

const API_BASE_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

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
