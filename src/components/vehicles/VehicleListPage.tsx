import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  CalendarBlank,
  CarProfile,
  CaretDown,
  CheckCircle,
  FadersHorizontal,
  GasPump,
  Heart,
  Lightning,
  MapPin,
  Seat,
  Star,
  SteeringWheel,
  X,
} from "@phosphor-icons/react";
import { demoVehicles, type VehicleListing } from "../../data/demo-vehicles";
import {
  createDefaultRentalSelection,
  formatRentalSummary,
  RentalTimeModal,
  type RentalSelection,
} from "../booking/RentalTimeModal";
import { CarDetailModal } from "./CarDetailModal";

type SortValue = "recommended" | "price-asc" | "price-desc" | "rating";

const LOCATIONS = ["TP. Hồ Chí Minh", "Hà Nội", "Đà Nẵng", "Bình Dương", "Đà Lạt", "Hạ Long"];
const money = new Intl.NumberFormat("vi-VN");

function initialRentalSelection(): RentalSelection {
  const params = new URLSearchParams(window.location.search);
  const fallback = createDefaultRentalSelection();
  const startAt = params.get("startAt");
  const endAt = params.get("endAt");
  const rentalType = params.get("rentalType") === "Hourly" ? "Hourly" : "Daily";
  if (!startAt || !endAt || Number.isNaN(Date.parse(startAt)) || Number.isNaN(Date.parse(endAt))) return fallback;
  const durationMs = new Date(endAt).getTime() - new Date(startAt).getTime();
  const billableUnits = rentalType === "Hourly" ? Math.round(durationMs / 3_600_000) : Math.ceil(durationMs / 86_400_000);
  return { rentalType, startAt, endAt, billableUnits, unitLabel: rentalType === "Hourly" ? "giờ" : "ngày" };
}

function VehicleCard({ vehicle, index, onOpen }: { vehicle: VehicleListing; index: number; onOpen: (vehicleId: string) => void }) {
  const [favorite, setFavorite] = useState(false);
  const reduceMotion = useReducedMotion();
  return (
    <motion.article
      className="vehicle-card"
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.055, 0.32), ease: [0.16, 1, 0.3, 1] }}
    >
      <a className="vehicle-card-image" href={`/cars?vehicle=${vehicle.id}`} aria-label={`Xem ${vehicle.brand} ${vehicle.model}`} onClick={(event) => { event.preventDefault(); onOpen(vehicle.id); }}>
        <img src={vehicle.imageUrl} alt={`${vehicle.brand} ${vehicle.model} ${vehicle.year}`} />
        {vehicle.instantBook ? <span className="instant-book" title="Đặt xe nhanh"><Lightning weight="fill" /></span> : null}
      </a>
      <button className={`vehicle-favorite ${favorite ? "is-active" : ""}`} type="button" aria-label={favorite ? "Bỏ khỏi yêu thích" : "Thêm vào yêu thích"} onClick={() => setFavorite((value) => !value)}>
        <Heart size={22} weight={favorite ? "fill" : "bold"} />
      </button>
      <div className="vehicle-card-body">
        <div className="vehicle-badges">
          {vehicle.depositFree ? <span><CheckCircle weight="fill" /> Miễn thế chấp</span> : null}
          {vehicle.deliveryAvailable ? <span><MapPin weight="fill" /> Giao xe tận nơi</span> : null}
        </div>
        <a href={`/cars?vehicle=${vehicle.id}`} onClick={(event) => { event.preventDefault(); onOpen(vehicle.id); }}><h2>{vehicle.brand} {vehicle.model} {vehicle.year}</h2></a>
        <div className="vehicle-specs">
          <span><SteeringWheel /> {vehicle.transmission === "Automatic" ? "Số tự động" : "Số sàn"}</span>
          <span><Seat /> {vehicle.seats} chỗ</span>
          <span><GasPump /> {vehicle.fuel === "Electric" ? "Điện" : "Xăng"}</span>
        </div>
        <p className="vehicle-address"><MapPin weight="fill" /> {vehicle.pickupAddress}</p>
        <div className="vehicle-card-footer">
          <span className="vehicle-rating"><Star weight="fill" /> {vehicle.rating.toFixed(1)} <i>•</i> {vehicle.completedTrips} chuyến</span>
          <strong>{money.format(vehicle.dayPrice / 1000)}K<small>/ngày</small></strong>
        </div>
      </div>
    </motion.article>
  );
}

export function VehicleListPage() {
  const params = new URLSearchParams(window.location.search);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(params.get("vehicle"));
  const [location, setLocation] = useState(params.get("location") || "TP. Hồ Chí Minh");
  const [rentalWindow, setRentalWindow] = useState<RentalSelection>(initialRentalSelection);
  const [isTimeOpen, setIsTimeOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [bodyType, setBodyType] = useState("all");
  const [brand, setBrand] = useState("all");
  const [transmission, setTransmission] = useState("all");
  const [seats, setSeats] = useState("all");
  const [fuel, setFuel] = useState("all");
  const [sort, setSort] = useState<SortValue>("recommended");
  const [maxPrice, setMaxPrice] = useState(1500000);
  const selectedVehicle = demoVehicles.find((vehicle) => vehicle.id === selectedVehicleId) ?? null;

  useEffect(() => {
    const syncSelectedVehicle = () => setSelectedVehicleId(new URLSearchParams(window.location.search).get("vehicle"));
    window.addEventListener("popstate", syncSelectedVehicle);
    return () => window.removeEventListener("popstate", syncSelectedVehicle);
  }, []);

  const openVehicle = (vehicleId: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("vehicle", vehicleId);
    window.history.pushState({}, "", url);
    setSelectedVehicleId(vehicleId);
  };

  const closeVehicle = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("vehicle");
    window.history.replaceState({}, "", url);
    setSelectedVehicleId(null);
  };

  const brands = useMemo(() => [...new Set(demoVehicles.map((vehicle) => vehicle.brand))].sort(), []);
  const vehicles = useMemo(() => {
    const matches = demoVehicles.filter((vehicle) =>
      (bodyType === "all" || vehicle.bodyType === bodyType)
      && (brand === "all" || vehicle.brand === brand)
      && (transmission === "all" || vehicle.transmission === transmission)
      && (seats === "all" || vehicle.seats === Number(seats))
      && (fuel === "all" || vehicle.fuel === fuel)
      && vehicle.dayPrice <= maxPrice,
    );
    return [...matches].sort((a, b) => {
      if (sort === "price-asc") return a.dayPrice - b.dayPrice;
      if (sort === "price-desc") return b.dayPrice - a.dayPrice;
      if (sort === "rating") return b.rating - a.rating || b.completedTrips - a.completedTrips;
      return Number(b.instantBook) - Number(a.instantBook) || b.completedTrips - a.completedTrips;
    });
  }, [bodyType, brand, fuel, maxPrice, seats, sort, transmission]);

  const resetFilters = () => {
    setBodyType("all"); setBrand("all"); setTransmission("all"); setSeats("all"); setFuel("all"); setSort("recommended"); setMaxPrice(1500000);
  };

  return (
    <main className="vehicle-list-page">
      <section className="vehicle-search-strip" aria-label="Thông tin tìm kiếm">
        <div className="vehicle-list-container vehicle-search-row">
          <a className="round-back-button" href="/" aria-label="Quay về trang chủ"><ArrowLeft size={19} /></a>
          <label className="list-search-control">
            <MapPin size={21} weight="bold" />
            <select value={location} onChange={(event) => setLocation(event.target.value)} aria-label="Địa điểm nhận xe">
              {LOCATIONS.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <button className="list-search-control list-time-control" type="button" onClick={() => setIsTimeOpen(true)}>
            <CalendarBlank size={21} weight="bold" /> <span>{formatRentalSummary(rentalWindow)}</span>
          </button>
        </div>
        <div className="vehicle-list-container filter-chip-row">
          <span className="filter-refresh"><CarProfile size={18} /></span>
          <label className={bodyType !== "all" ? "is-filtered" : ""}><CarProfile /><select value={bodyType} onChange={(event) => setBodyType(event.target.value)} aria-label="Loại xe"><option value="all">Loại xe</option><option value="Sedan">Sedan</option><option value="SUV">SUV</option><option value="MPV">MPV</option><option value="Hatchback">Hatchback</option></select><CaretDown /></label>
          <label className={brand !== "all" ? "is-filtered" : ""}><SteeringWheel /><select value={brand} onChange={(event) => setBrand(event.target.value)} aria-label="Hãng xe"><option value="all">Hãng xe</option>{brands.map((item) => <option key={item}>{item}</option>)}</select><CaretDown /></label>
          <label className={transmission !== "all" ? "is-filtered" : ""}><SteeringWheel /><select value={transmission} onChange={(event) => setTransmission(event.target.value)} aria-label="Truyền động"><option value="all">Truyền động</option><option value="Automatic">Số tự động</option><option value="Manual">Số sàn</option></select><CaretDown /></label>
          <label className={seats !== "all" ? "is-filtered" : ""}><Seat /><select value={seats} onChange={(event) => setSeats(event.target.value)} aria-label="Số chỗ"><option value="all">Số chỗ</option><option value="4">4 chỗ</option><option value="5">5 chỗ</option><option value="7">7 chỗ</option></select><CaretDown /></label>
          <button className="advanced-filter-trigger" type="button" onClick={() => setIsFilterOpen(true)}><FadersHorizontal /> Bộ lọc</button>
        </div>
      </section>

      <section className="vehicle-results vehicle-list-container">
        <div className="vehicle-results-heading">
          <div><p>Xe tự lái</p><h1>Xe tại {location}</h1><span>{vehicles.length} xe phù hợp với lựa chọn của bạn</span></div>
          <label className="sort-control">Sắp xếp<select value={sort} onChange={(event) => setSort(event.target.value as SortValue)}><option value="recommended">Tối ưu</option><option value="price-asc">Giá thấp nhất</option><option value="price-desc">Giá cao nhất</option><option value="rating">Đánh giá tốt nhất</option></select><CaretDown /></label>
        </div>
        {vehicles.length ? <div className="vehicle-grid">{vehicles.map((vehicle, index) => <VehicleCard vehicle={vehicle} index={index} onOpen={openVehicle} key={vehicle.id} />)}</div> : <div className="vehicle-empty"><CarProfile size={56} /><h2>Chưa tìm thấy xe phù hợp</h2><p>Hãy thử nới lỏng một vài điều kiện lọc.</p><button type="button" onClick={resetFilters}>Xóa bộ lọc</button></div>}
      </section>

      {selectedVehicle ? <CarDetailModal vehicle={selectedVehicle} initialRentalWindow={rentalWindow} onClose={closeVehicle} /> : null}
      {isTimeOpen ? <RentalTimeModal value={rentalWindow} onClose={() => setIsTimeOpen(false)} onConfirm={(selection) => { setRentalWindow(selection); setIsTimeOpen(false); }} /> : null}
      {isFilterOpen ? createPortal(
        <div className="vehicle-filter-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsFilterOpen(false); }}>
          <section className="vehicle-filter-modal" role="dialog" aria-modal="true" aria-labelledby="vehicle-filter-title">
            <header><h2 id="vehicle-filter-title">Bộ lọc</h2><button type="button" onClick={() => setIsFilterOpen(false)} aria-label="Đóng bộ lọc"><X /></button></header>
            <div className="vehicle-filter-content">
              <label className="filter-field"><span>Sắp xếp</span><select value={sort} onChange={(event) => setSort(event.target.value as SortValue)}><option value="recommended">Tối ưu</option><option value="price-asc">Giá thấp nhất</option><option value="price-desc">Giá cao nhất</option><option value="rating">Đánh giá tốt nhất</option></select></label>
              <fieldset><legend>Mức giá tối đa</legend><input type="range" min="500000" max="1500000" step="50000" value={maxPrice} onChange={(event) => setMaxPrice(Number(event.target.value))} /><strong>{money.format(maxPrice)}₫/ngày</strong></fieldset>
              <fieldset><legend>Truyền động</legend><div className="filter-options">{[["all", "Tất cả"], ["Automatic", "Số tự động"], ["Manual", "Số sàn"]].map(([value, label]) => <label key={value}><input type="radio" name="transmission" value={value} checked={transmission === value} onChange={(event) => setTransmission(event.target.value)} /> {label}</label>)}</div></fieldset>
              <fieldset><legend>Số chỗ</legend><div className="filter-options">{[["all", "Tất cả"], ["4", "4 chỗ"], ["5", "5 chỗ"], ["7", "7 chỗ"]].map(([value, label]) => <label key={value}><input type="radio" name="seats" value={value} checked={seats === value} onChange={(event) => setSeats(event.target.value)} /> {label}</label>)}</div></fieldset>
              <fieldset><legend>Nhiên liệu</legend><div className="filter-options">{[["all", "Tất cả"], ["Gasoline", "Xăng"], ["Electric", "Điện"]].map(([value, label]) => <label key={value}><input type="radio" name="fuel" value={value} checked={fuel === value} onChange={(event) => setFuel(event.target.value)} /> {label}</label>)}</div></fieldset>
            </div>
            <footer><button className="filter-reset" type="button" onClick={resetFilters}>Xóa bộ lọc</button><button className="filter-apply" type="button" onClick={() => setIsFilterOpen(false)}>Áp dụng · {vehicles.length} xe</button></footer>
          </section>
        </div>, document.body) : null}
    </main>
  );
}
