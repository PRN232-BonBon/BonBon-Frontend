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

// Temporary presentation data. This shape mirrors the future vehicle-listing API
// so it can be replaced by PostgreSQL records without changing the card UI.
export const demoVehicles: VehicleListing[] = [
  { id: "demo-corolla-cross", brand: "Toyota", model: "Corolla Cross", year: 2024, bodyType: "SUV", seats: 5, transmission: "Automatic", fuel: "Gasoline", pickupAddress: "Phường An Phú, TP. Thủ Đức", imageUrl: "/assets/services/become-owner-clean.webp", dayPrice: 890000, hourPrice: 185000, rating: 5, completedTrips: 42, depositFree: true, deliveryAvailable: true, instantBook: true },
  { id: "demo-fortuner", brand: "Toyota", model: "Fortuner", year: 2023, bodyType: "SUV", seats: 7, transmission: "Automatic", fuel: "Gasoline", pickupAddress: "Phường Thảo Điền, TP. Thủ Đức", imageUrl: "/assets/hero/hero.webp", dayPrice: 1280000, hourPrice: 240000, rating: 4.9, completedTrips: 67, depositFree: true, deliveryAvailable: true, instantBook: false },
  { id: "demo-vios", brand: "Toyota", model: "Vios", year: 2024, bodyType: "Sedan", seats: 5, transmission: "Automatic", fuel: "Gasoline", pickupAddress: "Phường 15, Quận Bình Thạnh", imageUrl: "/assets/services/self-drive-clean.webp", dayPrice: 650000, hourPrice: 145000, rating: 5, completedTrips: 31, depositFree: true, deliveryAvailable: false, instantBook: true },
  { id: "demo-mazda-3", brand: "Mazda", model: "3 Luxury", year: 2023, bodyType: "Sedan", seats: 5, transmission: "Automatic", fuel: "Gasoline", pickupAddress: "Phường Tân Định, Quận 1", imageUrl: "/assets/services/become-owner.webp", dayPrice: 790000, hourPrice: 165000, rating: 4.9, completedTrips: 28, depositFree: false, deliveryAvailable: true, instantBook: true },
  { id: "demo-vf6", brand: "VinFast", model: "VF 6 Plus", year: 2025, bodyType: "SUV", seats: 5, transmission: "Automatic", fuel: "Electric", pickupAddress: "Phường 8, Quận Gò Vấp", imageUrl: "/assets/services/become-owner-clean.webp", dayPrice: 1080000, hourPrice: 210000, rating: 5, completedTrips: 19, depositFree: true, deliveryAvailable: true, instantBook: true },
  { id: "demo-xpander", brand: "Mitsubishi", model: "Xpander", year: 2022, bodyType: "MPV", seats: 7, transmission: "Automatic", fuel: "Gasoline", pickupAddress: "Phường 5, Quận Bình Thạnh", imageUrl: "/assets/hero/hero.webp", dayPrice: 850000, hourPrice: 175000, rating: 4.8, completedTrips: 53, depositFree: true, deliveryAvailable: true, instantBook: false },
  { id: "demo-morning", brand: "Kia", model: "Morning", year: 2022, bodyType: "Hatchback", seats: 5, transmission: "Automatic", fuel: "Gasoline", pickupAddress: "Phường Bến Thành, Quận 1", imageUrl: "/assets/services/self-drive-clean.webp", dayPrice: 520000, hourPrice: 120000, rating: 4.9, completedTrips: 76, depositFree: false, deliveryAvailable: false, instantBook: true },
  { id: "demo-city", brand: "Honda", model: "City", year: 2024, bodyType: "Sedan", seats: 5, transmission: "Automatic", fuel: "Gasoline", pickupAddress: "Phường 2, Quận Tân Bình", imageUrl: "/assets/services/become-owner.webp", dayPrice: 720000, hourPrice: 155000, rating: 5, completedTrips: 14, depositFree: true, deliveryAvailable: true, instantBook: false },
  { id: "demo-ertiga", brand: "Suzuki", model: "Ertiga", year: 2021, bodyType: "MPV", seats: 7, transmission: "Manual", fuel: "Gasoline", pickupAddress: "Phường 12, Quận 10", imageUrl: "/assets/hero/hero.webp", dayPrice: 680000, hourPrice: 145000, rating: 4.8, completedTrips: 38, depositFree: true, deliveryAvailable: false, instantBook: false },
];
