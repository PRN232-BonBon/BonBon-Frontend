import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { AuthSession } from "../../src/auth/auth-api";
import { PickupConfirmationModal } from "../../src/components/portal/PickupConfirmationModal";
import { ReturnVehicleForm } from "../../src/components/booking/ReturnVehicleForm";
import { ReturnReview } from "../../src/components/booking/ReturnReview";
import { confirmPickup, getBookingDetail } from "../../src/portal/portal-api";
import { confirmReturn, getExcessMileage } from "../../src/booking/return-api";

vi.mock("../../src/components/booking/BookingModalShell", () => ({
  BookingModalShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock("../../src/portal/portal-api", () => ({ confirmPickup: vi.fn(), getBookingDetail: vi.fn() }));
vi.mock("../../src/booking/return-api", () => ({ confirmReturn: vi.fn(), getExcessMileage: vi.fn(), confirmOwnerReturn: vi.fn() }));
const session = { accessToken: "synthetic", account: { accountId: "demo", roles: ["Customer"] } } as AuthSession;

beforeEach(() => vi.clearAllMocks());

it("gửi số km và mô tả khi nhận xe, không gửi mức xăng", async () => {
  vi.mocked(confirmPickup).mockResolvedValue();
  const onConfirmed = vi.fn();
  render(<PickupConfirmationModal bookingId="booking" session={session} onClose={() => {}} onConfirmed={onConfirmed} />);
  fireEvent.change(screen.getByLabelText(/Số km trên đồng hồ/), { target: { value: "10000" } });
  fireEvent.change(screen.getByLabelText("Tình trạng xe"), { target: { value: "  Xe sạch  " } });
  expect(screen.queryByText(/Mức xăng/i)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận đã nhận xe" }));
  await waitFor(() => expect(confirmPickup).toHaveBeenCalledWith("booking", session, { odometerKm: 10000, conditionNotes: "Xe sạch" }));
  expect(onConfirmed).toHaveBeenCalled();
});

it("gửi số km và mô tả khi trả xe, không gửi mức xăng", async () => {
  vi.mocked(confirmReturn).mockResolvedValue({ actualDistanceKm: 550, includedMileageKm: 400, excessKm: 150, overageFeePerKm: 3000, excessFeeAmount: 450000, chargeId: "charge" });
  render(<ReturnVehicleForm bookingId="booking" session={session} title="Trả xe" submitLabel="Trả xe" onClose={() => {}} onReturned={() => {}} />);
  fireEvent.change(screen.getByLabelText(/Số km hiện tại/), { target: { value: "10550" } });
  fireEvent.change(screen.getByLabelText("Tình trạng xe"), { target: { value: "Xe bình thường" } });
  expect(screen.queryByText(/Mức xăng/i)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Trả xe" }));
  await waitFor(() => expect(confirmReturn).toHaveBeenCalledWith(session, "booking", { odometerKm: 10550, conditionNotes: "Xe bình thường" }));
});

it("chủ xe xem được mô tả lúc nhận và lúc trả để đối chiếu", async () => {
  vi.mocked(getBookingDetail).mockResolvedValue({ inspections: [
    { kind: "Pickup", odometerKm: 10000, conditionNotes: "Xe sạch" },
    { kind: "Return", odometerKm: 10550, conditionNotes: "Xe có vết xước" },
  ] } as Awaited<ReturnType<typeof getBookingDetail>>);
  vi.mocked(getExcessMileage).mockResolvedValue({ actualDistanceKm: 550, includedMileageKm: 400, excessKm: 150, overageFeePerKm: 3000, excessFeeAmount: 450000, chargeId: "charge" });
  render(<ReturnReview bookingId="booking" session={session} onClose={() => {}} onConfirmed={() => {}} />);
  expect(await screen.findByText("Xe sạch")).toBeTruthy();
  expect(screen.getByText("Xe có vết xước")).toBeTruthy();
  expect(screen.queryByText(/Mức xăng/i)).toBeNull();
});
