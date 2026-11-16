import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { RentalTimeModal, type RentalSelection } from "../../src/components/booking/RentalTimeModal";

const selection: RentalSelection = {
  rentalType: "Daily", startAt: "2026-11-17T02:00:00Z", endAt: "2026-11-18T02:00:00Z",
  billableUnits: 1, unitLabel: "ngày",
};

function renderModal(value = selection) {
  render(<RentalTimeModal value={value} onClose={() => {}} onConfirm={() => {}} />);
}

it("disables past pickup times for today but allows them on a future day", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-16T03:10:00Z")); // 10:10 in Vietnam
  renderModal();
  fireEvent.click(screen.getByRole("button", { name: "Chọn ngày 16 tháng 11" }));
  const pickup = screen.getByLabelText("Nhận xe") as HTMLSelectElement;
  expect(pickup.value).toBe("10:30");
  expect((within(pickup).getByRole("option", { name: "10:00" }) as HTMLOptionElement).disabled).toBe(true);
  expect((within(pickup).getByRole("option", { name: "10:30" }) as HTMLOptionElement).disabled).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "Chọn ngày 17 tháng 11" }));
  fireEvent.click(screen.getByRole("button", { name: "Chọn ngày 18 tháng 11" }));
  fireEvent.click(screen.getByRole("button", { name: "Chọn ngày 17 tháng 11" }));
  expect((within(pickup).getByRole("option", { name: "00:00" }) as HTMLOptionElement).disabled).toBe(false);
});

it("replaces an expired daily selection when reopening the modal", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-16T03:10:00Z"));
  renderModal({ ...selection, startAt: "2026-11-15T02:00:00Z", endAt: "2026-11-16T02:00:00Z" });
  expect((screen.getByLabelText("Nhận xe") as HTMLSelectElement).value).toBe("10:30");
  expect(screen.getByRole("button", { name: "Chọn ngày 16 tháng 11" }).className).toContain("is-selected");
});

it("does not restore an expired daily pickup when switching rental modes", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-16T03:10:00Z"));
  renderModal({ ...selection, startAt: "2026-11-16T03:30:00Z", endAt: "2026-11-17T03:30:00Z" });
  fireEvent.click(screen.getByRole("tab", { name: "Thuê giờ" }));
  vi.setSystemTime(new Date("2026-11-16T03:30:00Z"));
  fireEvent.click(screen.getByRole("tab", { name: "Thuê ngày" }));
  const pickup = screen.getByLabelText("Nhận xe") as HTMLSelectElement;
  expect(pickup.value).toBe("11:00");
  expect((within(pickup).getByRole("option", { name: "10:30" }) as HTMLOptionElement).disabled).toBe(true);
});

it("moves an expired late-night daily pickup to the next day", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-16T16:35:00Z")); // 23:35 in Vietnam
  renderModal({ ...selection, startAt: "2026-11-16T16:30:00Z" });
  expect((screen.getByLabelText("Nhận xe") as HTMLSelectElement).value).toBe("00:00");
  expect(screen.getByRole("button", { name: "Chọn ngày 17 tháng 11" }).className).toContain("is-selected");
});

it("blocks a daily slot that expires while the modal is open", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-16T03:29:50Z"));
  renderModal({ ...selection, startAt: "2026-11-16T03:30:00Z", endAt: "2026-11-17T03:30:00Z" });
  act(() => vi.advanceTimersByTime(15_000));
  expect((screen.getByRole("button", { name: "Tiếp tục" }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByText("Giờ nhận xe đã qua. Vui lòng chọn giờ khác.")).toBeTruthy();
});

it("explains when no pickup slots remain today", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-16T16:35:00Z"));
  renderModal();
  fireEvent.click(screen.getByRole("button", { name: "Chọn ngày 16 tháng 11" }));
  expect(screen.getByText("Không còn giờ nhận xe trong ngày này. Vui lòng chọn ngày tiếp theo.")).toBeTruthy();
  expect((screen.getByRole("button", { name: "Tiếp tục" }) as HTMLButtonElement).disabled).toBe(true);
});
