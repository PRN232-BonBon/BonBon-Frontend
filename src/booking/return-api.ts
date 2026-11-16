import type { AuthSession } from "../auth/auth-api";
import { formatBookingMoney } from "./booking-display";

const API_BASE_URL = (import.meta.env?.VITE_API_URL || "/api").replace(/\/$/, "");

/** Body của `ConfirmReturnRequest`. */
export interface ReturnVehiclePayload {
  odometerKm: number;
  fuelLevel: number | null;
  conditionNotes: string | null;
  inspectedAt: string | null;
}

/** `ExcessMileageCalculationResponse` — kết quả trả xe kèm phí vượt km. */
export interface ExcessMileageResult {
  actualDistanceKm: number;
  includedMileageKm: number | null;
  excessKm: number;
  overageFeePerKm: number | null;
  excessFeeAmount: number;
  chargeId: string | null;
}

/**
 * `POST /api/bookings/{id}/return` — cả khách thuê và chủ xe đều gọi được.
 * Backend tạo biên bản `Return`, tính quãng đường thực tế và phí vượt km,
 * rồi chuyển booking `InProgress` → `Returned`.
 */
export async function confirmReturn(session: AuthSession, bookingId: string, payload: ReturnVehiclePayload): Promise<ExcessMileageResult> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/bookings/${encodeURIComponent(bookingId)}/return`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error("Không kết nối được tới BonBon. Hãy cập nhật lại đơn trước khi thử lại.");
  }

  if (!response.ok) {
    const problem = await response.json().catch(() => null) as
      { detail?: string; title?: string; errors?: Record<string, string[]> } | null;
    const validation = problem?.errors ? Object.values(problem.errors).flat().find(Boolean) : undefined;
    throw new Error(validation || problem?.detail || problem?.title
      || (response.status === 401 ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
        : "Không thể xác nhận trả xe. Vui lòng thử lại."));
  }

  return response.json() as Promise<ExcessMileageResult>;
}

const numberFormatter = new Intl.NumberFormat("vi-VN");

/** Câu tóm tắt để hiện sau khi trả xe thành công. */
export function returnSummary(result: ExcessMileageResult) {
  const parts = [
    "Đã xác nhận trả xe.",
    `Quãng đường thực tế ${numberFormatter.format(result.actualDistanceKm)} km`,
  ];
  if (result.includedMileageKm !== null) parts.push(`hạn mức ${numberFormatter.format(result.includedMileageKm)} km`);
  if (result.excessKm > 0) parts.push(`vượt ${numberFormatter.format(result.excessKm)} km · phí vượt ${formatBookingMoney(result.excessFeeAmount)}`);
  else parts.push("không vượt giới hạn km");
  return `${parts.join(" · ")}.`;
}
