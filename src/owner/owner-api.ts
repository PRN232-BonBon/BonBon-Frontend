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

export async function registerVehicle(
  session: AuthSession,
  payload: VehicleRegistrationPayload,
  vehicleImages: File[],
  registrationDocument: File,
) {
  const body = new FormData();
  body.append("metadata", JSON.stringify(payload));
  vehicleImages.forEach((image) => body.append("vehicleImages", image));
  body.append("registrationDocument", registrationDocument);

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
