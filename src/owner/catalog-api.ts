import type { VehicleListing } from "../data/demo-vehicles";

const API = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
function imageUrl(url: string) {
  return url.startsWith("/api/") ? `${API.replace(/\/api$/, "")}${url}` : url;
}

export async function getVehicleCatalog(signal?: AbortSignal): Promise<VehicleListing[]> {
  const response = await fetch(`${API}/vehicles`, { signal });
  if (!response.ok) throw new Error("Không thể tải danh sách xe. Vui lòng thử lại.");
  const vehicles = await response.json() as VehicleListing[];
  return vehicles.map(vehicle => ({ ...vehicle, imageUrl: imageUrl(vehicle.imageUrl || "/not-found.webp"), imageUrls: vehicle.imageUrls.map(imageUrl) }));
}
