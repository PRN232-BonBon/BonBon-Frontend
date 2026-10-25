export type VehicleTransmission = "Automatic" | "Manual";
export type VehicleFuel = "Gasoline" | "Electric" | "Diesel" | "Hybrid";
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
  imageUrls: string[];
  description: string;
  features: string[];
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
  { id: "20000000-0000-0000-0000-000000000001", brand: "Hyundai", model: "Accent", year: 2024, bodyType: "Sedan", seats: 5, transmission: "Automatic", fuel: "Gasoline", pickupAddress: "Phường An Phú, TP. Thủ Đức", imageUrl: "/assets/cars/hyundai-accent-2024-1.webp", imageUrls: ["/assets/cars/hyundai-accent-2024-1.webp", "/assets/cars/hyundai-accent-2024-2.webp", "/assets/cars/hyundai-accent-2024-3.webp"], description: "Sedan 5 chỗ hiện đại, vận hành êm và tiết kiệm nhiên liệu, phù hợp đi phố hoặc những chuyến đi ngắn cuối tuần.", features: ["Bluetooth", "Camera lùi", "Khe cắm USB", "Điều hòa", "Túi khí an toàn"], dayPrice: 761000, hourPrice: 120000, rating: 5, completedTrips: 6, depositFree: true, deliveryAvailable: true, instantBook: true },
  { id: "20000000-0000-0000-0000-000000000002", brand: "Toyota", model: "Avanza", year: 2022, bodyType: "MPV", seats: 7, transmission: "Automatic", fuel: "Gasoline", pickupAddress: "Phường Thảo Điền, TP. Thủ Đức", imageUrl: "/assets/cars/toyota-avanza-2022-1.webp", imageUrls: ["/assets/cars/toyota-avanza-2022-1.webp", "/assets/cars/toyota-avanza-2022-2.webp", "/assets/cars/toyota-avanza-2022-3.webp"], description: "MPV 7 chỗ rộng rãi với cách bố trí ghế linh hoạt, phù hợp gia đình và nhóm bạn cần nhiều không gian hành lý.", features: ["Bluetooth", "Camera lùi", "Khe cắm USB", "Điều hòa sau", "Túi khí an toàn"], dayPrice: 915000, hourPrice: 160000, rating: 5, completedTrips: 12, depositFree: true, deliveryAvailable: true, instantBook: false },
  { id: "20000000-0000-0000-0000-000000000003", brand: "Toyota", model: "Vios", year: 2026, bodyType: "Sedan", seats: 5, transmission: "Automatic", fuel: "Gasoline", pickupAddress: "Phường 15, Quận Bình Thạnh", imageUrl: "/assets/cars/toyota-vios-2026-1.webp", imageUrls: ["/assets/cars/toyota-vios-2026-1.webp", "/assets/cars/toyota-vios-2026-2.webp", "/assets/cars/toyota-vios-2026-3.webp"], description: "Sedan phổ thông dễ lái, khoang hành khách thoải mái và chi phí vận hành hợp lý cho nhu cầu di chuyển hằng ngày.", features: ["Bluetooth", "Camera lùi", "Khe cắm USB", "Điều hòa", "Túi khí an toàn"], dayPrice: 679000, hourPrice: 120000, rating: 4.9, completedTrips: 35, depositFree: true, deliveryAvailable: true, instantBook: true },
  { id: "20000000-0000-0000-0000-000000000004", brand: "VinFast", model: "VF 3", year: 2026, bodyType: "SUV", seats: 4, transmission: "Automatic", fuel: "Electric", pickupAddress: "Phường Bến Thành, Quận 1", imageUrl: "/assets/cars/vinfast-vf3-2026-1.webp", imageUrls: ["/assets/cars/vinfast-vf3-2026-1.webp", "/assets/cars/vinfast-vf3-2026-2.webp", "/assets/cars/vinfast-vf3-2026-3.webp", "/assets/cars/vinfast-vf3-2026-4.webp"], description: "Mẫu xe điện đô thị nhỏ gọn, dễ xoay trở và đỗ xe, phù hợp các chuyến đi ngắn trong thành phố.", features: ["Màn hình giải trí", "Khe cắm USB", "Điều hòa", "Camera lùi", "Phanh ABS"], dayPrice: 555000, hourPrice: 90000, rating: 5, completedTrips: 7, depositFree: true, deliveryAvailable: true, instantBook: true },
  { id: "20000000-0000-0000-0000-000000000005", brand: "VinFast", model: "VF 8 Plus", year: 2024, bodyType: "SUV", seats: 5, transmission: "Automatic", fuel: "Electric", pickupAddress: "Phường 8, Quận Gò Vấp", imageUrl: "/assets/cars/vinfast-vf8-plus-2024-1.webp", imageUrls: ["/assets/cars/vinfast-vf8-plus-2024-1.webp", "/assets/cars/vinfast-vf8-plus-2024-2.webp", "/assets/cars/vinfast-vf8-plus-2024-3.webp"], description: "SUV điện 5 chỗ rộng rãi, tăng tốc mượt và nhiều tiện nghi, phù hợp cả di chuyển nội đô lẫn hành trình dài.", features: ["Bluetooth", "Camera 360", "Định vị GPS", "Khe cắm USB", "Túi khí an toàn"], dayPrice: 1340000, hourPrice: 220000, rating: 5, completedTrips: 18, depositFree: true, deliveryAvailable: true, instantBook: false },
];
