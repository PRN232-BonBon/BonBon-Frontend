import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { PhoneContact } from "../../src/components/common/PhoneContact";
import { OwnerBookingsPage } from "../../src/components/owner/OwnerBookingsPage";
import { CarDetailModal } from "../../src/components/vehicles/CarDetailModal";
import type { VehicleListing } from "../../src/data/demo-vehicles";

const fakeAuth = vi.hoisted(() => ({ session: { accessToken: "synthetic", account: { accountId: "owner", roles: ["VehicleOwner"] } } }));
vi.mock("../../src/auth/AuthContext", () => ({ useAuth: () => fakeAuth }));
vi.mock("../../src/components/booking/ReturnReview", () => ({ ReturnReview: () => null }));

it("links only a valid phone number and explains when the number is missing", () => {
  const view = render(<PhoneContact phone="(+84) 900-111-222" label="Số điện thoại" />);
  expect(screen.getByRole("link").getAttribute("href")).toBe("tel:+84900111222");
  view.rerender(<PhoneContact phone={null} label="Số điện thoại" />);
  expect(screen.getByText("Chưa cập nhật")).toBeTruthy();
  view.rerender(<PhoneContact phone="invalid" label="Số điện thoại" />);
  expect(screen.queryByRole("link")).toBeNull();
});

it("shows the renter's phone only from the authenticated owner's booking response", async () => {
  vi.mocked(fetch).mockResolvedValueOnce(Response.json([{ bookingId: "booking", vehicleName: "Xe demo", plateNumber: "TEST",
    coverImageUrl: null, customerName: "Khách demo", customerPhone: "0900111222", rentalType: "Daily",
    startAt: "2099-01-01T02:00:00Z", endAt: "2099-01-02T02:00:00Z", totalAmount: 5000, status: "Confirmed" }]));
  render(<OwnerBookingsPage />);
  const link = await screen.findByRole("link", { name: "0900111222" });
  expect(link.getAttribute("href")).toBe("tel:0900111222");
  expect(screen.getByText("Số điện thoại khách thuê:")).toBeTruthy();
});

it("shows the owner's contact in car details", () => {
  const vehicle = { id: "vehicle", brand: "Toyota", model: "Vios", year: 2026, seats: 5, transmission: "Automatic",
    fuel: "Gasoline", bodyType: "Sedan", pickupAddress: "TP. Hồ Chí Minh", imageUrl: "/image.webp", imageUrls: ["/image.webp"],
    features: [], owner: { ownerId: "owner", fullName: "Chủ xe demo", phone: "0900222333" },
    description: "Xe demo", hourPrice: 100000, dayPrice: 600000, rating: 0, completedTrips: 0,
    depositFree: false, deliveryAvailable: false, instantBook: false } satisfies VehicleListing;
  render(<CarDetailModal vehicle={vehicle} initialRentalWindow={{ rentalType: "Daily", startAt: "2099-01-01T02:00:00Z", endAt: "2099-01-02T02:00:00Z", billableUnits: 1, unitLabel: "ngày" }} onClose={() => {}} />);
  expect(screen.getByRole("link", { name: "0900222333" }).getAttribute("href")).toBe("tel:0900222333");
});
