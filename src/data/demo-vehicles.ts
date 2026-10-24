export type VehicleTransmission = "Automatic" | "Manual";
export type VehicleFuel = "Gasoline" | "Electric";
export type VehicleBodyType = "Sedan" | "SUV" | "MPV" | "Hatchback";

export interface VehicleListing {
  id: string;
  brand: string;
  model: string;
  year: number;
  bodyType: VehicleBodyType;
  seats: number;
  transmission: VehicleTransmission;
  fuel: VehicleFuel;
  pickupAddress: string;
  imageUrl: string;
  dayPrice: number;
  hourPrice: number;
  rating: number;
  completedTrips: number;
  depositFree: boolean;
  deliveryAvailable: boolean;
  instantBook: boolean;
}

// Temporary presentation data kept in sync with the PostgreSQL demo catalog.
// The listing API can replace this array without changing the card UI.
export const demoVehicles: VehicleListing[] = [
  { id: "20000000-0000-0000-0000-000000000001", brand: "Hyundai", model: "Accent", year: 2024, bodyType: "Sedan", seats: 5, transmission: "Automatic", fuel: "Gasoline", pickupAddress: "Phường An Phú, TP. Thủ Đức", imageUrl: "/assets/cars/hyundai-accent-2024-1.webp", dayPrice: 761000, hourPrice: 120000, rating: 5, completedTrips: 6, depositFree: true, deliveryAvailable: true, instantBook: true },
  { id: "20000000-0000-0000-0000-000000000002", brand: "Toyota", model: "Avanza", year: 2022, bodyType: "MPV", seats: 7, transmission: "Automatic", fuel: "Gasoline", pickupAddress: "Phường Thảo Điền, TP. Thủ Đức", imageUrl: "/assets/cars/toyota-avanza-2022-1.webp", dayPrice: 915000, hourPrice: 160000, rating: 5, completedTrips: 12, depositFree: true, deliveryAvailable: true, instantBook: false },
  { id: "20000000-0000-0000-0000-000000000003", brand: "Toyota", model: "Vios", year: 2026, bodyType: "Sedan", seats: 5, transmission: "Automatic", fuel: "Gasoline", pickupAddress: "Phường 15, Quận Bình Thạnh", imageUrl: "/assets/cars/toyota-vios-2026-1.webp", dayPrice: 679000, hourPrice: 120000, rating: 4.9, completedTrips: 35, depositFree: true, deliveryAvailable: true, instantBook: true },
  { id: "20000000-0000-0000-0000-000000000004", brand: "VinFast", model: "VF 3", year: 2026, bodyType: "SUV", seats: 4, transmission: "Automatic", fuel: "Electric", pickupAddress: "Phường Bến Thành, Quận 1", imageUrl: "/assets/cars/vinfast-vf3-2026-1.webp", dayPrice: 555000, hourPrice: 90000, rating: 5, completedTrips: 7, depositFree: true, deliveryAvailable: true, instantBook: true },
  { id: "20000000-0000-0000-0000-000000000005", brand: "VinFast", model: "VF 8 Plus", year: 2024, bodyType: "SUV", seats: 5, transmission: "Automatic", fuel: "Electric", pickupAddress: "Phường 8, Quận Gò Vấp", imageUrl: "/assets/cars/vinfast-vf8-plus-2024-1.webp", dayPrice: 1340000, hourPrice: 220000, rating: 5, completedTrips: 18, depositFree: true, deliveryAvailable: true, instantBook: false },
];
