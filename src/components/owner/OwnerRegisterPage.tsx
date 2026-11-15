import { type ChangeEvent, type CSSProperties, type FormEvent, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Baby,
  Bluetooth,
  Camera,
  CarProfile,
  Check,
  CheckCircle,
  ContactlessPayment,
  ImageSquare,
  MapPin,
  Monitor,
  SecurityCamera,
  ShieldCheck,
  Tire,
  Trash,
  Usb,
} from "@phosphor-icons/react";
import { useAuth } from "../../auth/AuthContext";
import { getRejectedRegistration, registerVehicle } from "../../owner/owner-api";

type RegisterStep = 1 | 2 | 3;

interface VehicleDraft {
  plateNumber: string;
  brand: string;
  model: string;
  productionYear: string;
  seats: string;
  transmission: string;
  fuelType: string;
  bodyType: string;
  description: string;
  pickupAddress: string;
  hourPrice: string;
  dayPrice: string;
  weeklyDiscountEnabled: boolean;
  weeklyDiscountPercent: string;
  mileageLimitEnabled: boolean;
  dailyMileageLimit: string;
  overageFeePerKm: string;
  rentalTerms: string;
  features: string[];
}

const initialDraft: VehicleDraft = {
  plateNumber: "",
  brand: "",
  model: "",
  productionYear: String(new Date().getFullYear()),
  seats: "5",
  transmission: "Automatic",
  fuelType: "Gasoline",
  bodyType: "Sedan",
  description: "",
  pickupAddress: "",
  hourPrice: "",
  dayPrice: "",
  weeklyDiscountEnabled: false,
  weeklyDiscountPercent: "10",
  mileageLimitEnabled: true,
  dailyMileageLimit: "400",
  overageFeePerKm: "3000",
  rentalTerms: "",
  features: [],
};

const amenities = [
  { label: "Bluetooth", icon: Bluetooth },
  { label: "Camera lùi", icon: SecurityCamera },
  { label: "Định vị GPS", icon: MapPin },
  { label: "Ghế trẻ em", icon: Baby },
  { label: "Khe cắm USB", icon: Usb },
  { label: "Lốp dự phòng", icon: Tire },
  { label: "Màn hình giải trí", icon: Monitor },
  { label: "ETC", icon: ContactlessPayment },
  { label: "Túi khí an toàn", icon: ShieldCheck },
];
const brands = ["Toyota", "Hyundai", "Kia", "Mazda", "Mitsubishi", "Honda", "Ford", "VinFast", "Mercedes-Benz", "Khác"];
const currentYear = Number(new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date()));
const years = Array.from({ length: currentYear - 1989 }, (_, index) => String(currentYear - index));

function FieldError({ children }: { children?: string }) {
  return children ? <small className="owner-field-error">{children}</small> : null;
}

function rangeStyle(value: string, min: number, max: number, enabled: boolean): CSSProperties {
  const progress = enabled ? ((Number(value) - min) / (max - min)) * 100 : 0;
  return { "--owner-range-progress": `${Math.min(100, Math.max(0, progress))}%` } as CSSProperties;
}

function validateStep(step: RegisterStep, draft: VehicleDraft, vehicleImages: File[], existingImages = 0) {
  const errors: Record<string, string> = {};
  if (step === 1) {
    if (!draft.plateNumber.trim() || draft.plateNumber.trim().length > 30) errors.plateNumber = "Biển số xe cần từ 1 đến 30 ký tự.";
    if (!draft.brand || draft.brand.length > 80) errors.brand = "Vui lòng chọn hãng xe hợp lệ.";
    if (!draft.model.trim() || draft.model.trim().length > 100) errors.model = "Mẫu xe cần từ 1 đến 100 ký tự.";
    if (draft.description.trim().length < 20 || draft.description.trim().length > 2000) errors.description = "Mô tả cần từ 20 đến 2.000 ký tự.";
  }
  if (step === 2) {
    if (draft.pickupAddress.trim().length < 10 || draft.pickupAddress.trim().length > 1000) errors.pickupAddress = "Địa chỉ nhận xe cần từ 10 đến 1.000 ký tự.";
    if (!Number.isFinite(Number(draft.hourPrice)) || Number(draft.hourPrice) < 50000 || Number(draft.hourPrice) > 10000000) errors.hourPrice = "Giá theo giờ từ 50.000đ đến 10.000.000đ.";
    if (!Number.isFinite(Number(draft.dayPrice)) || Number(draft.dayPrice) < 300000 || Number(draft.dayPrice) > 100000000) errors.dayPrice = "Giá theo ngày từ 300.000đ đến 100.000.000đ.";
    if (draft.rentalTerms.trim() && (draft.rentalTerms.trim().length < 10 || draft.rentalTerms.trim().length > 1000)) errors.rentalTerms = "Điều khoản cần từ 10 đến 1.000 ký tự.";
    if (draft.weeklyDiscountEnabled && (Number(draft.weeklyDiscountPercent) < 5 || Number(draft.weeklyDiscountPercent) > 30)) {
      errors.weeklyDiscountPercent = "Mức giảm giá cần nằm trong khoảng 5% đến 30%.";
    }
    if (draft.mileageLimitEnabled && (Number(draft.dailyMileageLimit) < 100 || Number(draft.dailyMileageLimit) > 800)) {
      errors.dailyMileageLimit = "Giới hạn quãng đường cần nằm trong khoảng 100km đến 800km mỗi ngày.";
    }
    if (draft.mileageLimitEnabled && (Number(draft.overageFeePerKm) < 1000 || Number(draft.overageFeePerKm) > 10000)) {
      errors.overageFeePerKm = "Phí vượt giới hạn cần nằm trong khoảng 1.000đ đến 10.000đ mỗi km.";
    }
  }
  if (step === 3) {
    if (vehicleImages.length < 1 && existingImages < 1) errors.vehicleImages = "Vui lòng chọn ít nhất 1 ảnh xe.";
  }
  return errors;
}

export function OwnerRegisterPage() {
  const [editId] = useState(() => new URLSearchParams(window.location.search).get("edit"));
  const [step, setStep] = useState<RegisterStep>(1);
  const [draft, setDraft] = useState<VehicleDraft>(initialDraft);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [vehicleImages, setVehicleImages] = useState<File[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [editLoading, setEditLoading] = useState(!!editId);
  const [editError, setEditError] = useState("");
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const { session } = useAuth();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!editId || !session) return;
    let active = true;
    setEditLoading(true); setEditError("");
    getRejectedRegistration(session, editId).then(item => {
      if (!active) return;
      setDraft({ plateNumber: item.plateNumber, brand: item.brand, model: item.model,
        productionYear: String(item.productionYear), seats: String(item.seats), transmission: item.transmission,
        fuelType: item.fuelType, bodyType: item.bodyType, description: item.description, pickupAddress: item.pickupAddress,
        hourPrice: String(item.hourPrice), dayPrice: String(item.dayPrice), weeklyDiscountEnabled: item.weeklyDiscountEnabled,
        weeklyDiscountPercent: String(item.weeklyDiscountPercent ?? 10), mileageLimitEnabled: item.mileageLimitEnabled,
        dailyMileageLimit: String(item.dailyMileageLimitKm ?? 400), overageFeePerKm: String(item.overageFeePerKm ?? 3000),
        rentalTerms: item.rentalTerms ?? "", features: item.features ?? [] });
      setExistingImages(item.imageUrls); setRejectionReason(item.rejectionReason);
    }).catch(error => { if (active) setEditError(error instanceof Error ? error.message : "Không thể tải hồ sơ xe."); })
      .finally(() => { if (active) setEditLoading(false); });
    return () => { active = false; };
  }, [editId, session?.account.accountId]);

  const vehicleImageUrls = useMemo(() => vehicleImages.map((file) => URL.createObjectURL(file)), [vehicleImages]);

  useEffect(() => () => {
    vehicleImageUrls.forEach((url) => URL.revokeObjectURL(url));
  }, [vehicleImageUrls]);

  const setField = (field: keyof VehicleDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  const toggleFeature = (feature: string) => {
    setDraft((current) => ({
      ...current,
      features: current.features.includes(feature)
        ? current.features.filter((item) => item !== feature)
        : [...current.features, feature],
    }));
  };

  const next = () => {
    const nextErrors = validateStep(step, draft, vehicleImages, existingImages.length);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setStep((current) => Math.min(3, current + 1) as RegisterStep);
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validateStep(3, draft, vehicleImages, existingImages.length);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    if (!session) {
      window.dispatchEvent(new CustomEvent("bonbon:open-auth", { detail: "login" }));
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError("");
      await registerVehicle(session, {
        plateNumber: draft.plateNumber.trim(),
        brand: draft.brand,
        model: draft.model.trim(),
        productionYear: Number(draft.productionYear),
        seats: Number(draft.seats),
        transmission: draft.transmission,
        fuelType: draft.fuelType,
        bodyType: draft.bodyType,
        description: draft.description.trim(),
        pickupAddress: draft.pickupAddress.trim(),
        hourPrice: Number(draft.hourPrice),
        dayPrice: Number(draft.dayPrice),
        weeklyDiscountEnabled: draft.weeklyDiscountEnabled,
        weeklyDiscountPercent: draft.weeklyDiscountEnabled ? Number(draft.weeklyDiscountPercent) : null,
        mileageLimitEnabled: draft.mileageLimitEnabled,
        dailyMileageLimitKm: draft.mileageLimitEnabled ? Number(draft.dailyMileageLimit) : null,
        overageFeePerKm: draft.mileageLimitEnabled ? Number(draft.overageFeePerKm) : null,
        rentalTerms: draft.rentalTerms.trim() || null,
        features: draft.features,
      }, vehicleImages, editId ?? undefined);
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Không thể gửi đăng ký xe. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  const onVehicleImages = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []).filter((file) => file.type.startsWith("image/"));
    setVehicleImages((current) => [...current, ...selected].slice(0, 8));
    setErrors((current) => ({ ...current, vehicleImages: "" }));
    event.target.value = "";
  };

  const makeCover = (index: number) => setVehicleImages((current) => {
    const next = [...current];
    const [cover] = next.splice(index, 1);
    next.unshift(cover);
    return next;
  });

  if (editId && !session) return <main className="owner-page"><div className="owner-container"><p>Vui lòng đăng nhập để chỉnh sửa hồ sơ xe.</p><button type="button" onClick={() => window.dispatchEvent(new CustomEvent("bonbon:open-auth", { detail: "login" }))}>Đăng nhập</button></div></main>;
  if (editId && editLoading) return <main className="owner-page"><div className="owner-container">Đang tải hồ sơ xe…</div></main>;
  if (editId && editError) return <main className="owner-page"><div className="owner-container"><p role="alert">{editError}</p><a href="/owner/cars">Về danh sách xe</a></div></main>;
  if (submitted) {
    return (
      <main className="owner-page owner-success-page">
        <motion.section className="owner-success" initial={reduceMotion ? false : { opacity: 0, scale: .97, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: .5, ease: [0.16, 1, 0.3, 1] }}>
          <span><CheckCircle size={54} weight="fill" /></span>
          <h1>{editId ? "Đã gửi lại hồ sơ xe" : "Đã gửi đăng ký xe"}</h1>
          <p>BonBon đã nhận thông tin {draft.brand} {draft.model}. Hồ sơ đang chờ kiểm tra trước khi xe được hiển thị.</p>
          <div><a className="owner-primary-button" href="/owner/cars">Xem xe của tôi</a><a className="owner-secondary-button" href="/">Về trang chủ</a></div>
        </motion.section>
      </main>
    );
  }

  return (
    <main className="owner-page owner-register-page">
      <div className="owner-container">
        <div className="owner-page-heading">
          <a href="/become-owner" aria-label="Quay lại"><ArrowLeft size={21} weight="bold" /> Quay lại</a>
          <h1>{editId ? "Chỉnh sửa hồ sơ xe" : "Đăng ký xe"}</h1>
        </div>

        <section className="owner-register-card">
          {editId && rejectionReason ? <p className="owner-submit-error" role="status">Lý do từ chối: {rejectionReason}</p> : null}
          <ol className="owner-stepper" aria-label="Tiến trình đăng ký">
            {[{ number: 1, label: "Thông tin" }, { number: 2, label: "Cho thuê" }, { number: 3, label: "Hình ảnh" }].map((item) => (
              <li key={item.number} className={step === item.number ? "is-active" : step > item.number ? "is-complete" : ""}>
                <span>{step > item.number ? <Check size={18} weight="bold" /> : item.number}</span>
                <strong>{item.label}</strong>
              </li>
            ))}
          </ol>

          <form onSubmit={submit} noValidate>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                className="owner-form-step"
                key={step}
                initial={reduceMotion ? false : { opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, x: -14 }}
                transition={{ duration: .28, ease: [0.16, 1, 0.3, 1] }}
              >
                {step === 1 ? (
                  <>
                    <div className="owner-form-section-heading"><CarProfile size={25} weight="duotone" /><div><h2>Thông tin xe</h2><p>Các thông tin nhận diện chính sẽ được BonBon kiểm tra trước khi duyệt.</p></div></div>
                    <div className="owner-form-grid">
                      <label><span>Biển số xe *</span><input value={draft.plateNumber} onChange={(event) => setField("plateNumber", event.target.value.toUpperCase())} placeholder="Ví dụ: 51K-123.45" /><FieldError>{errors.plateNumber}</FieldError></label>
                      <label><span>Hãng xe *</span><select value={draft.brand} onChange={(event) => setField("brand", event.target.value)}><option value="">Chọn hãng xe</option>{brands.map((brand) => <option key={brand}>{brand}</option>)}</select><FieldError>{errors.brand}</FieldError></label>
                      <label><span>Mẫu xe *</span><input value={draft.model} onChange={(event) => setField("model", event.target.value)} placeholder="Ví dụ: Vios" /><FieldError>{errors.model}</FieldError></label>
                      <label><span>Năm sản xuất</span><select value={draft.productionYear} onChange={(event) => setField("productionYear", event.target.value)}>{years.map((year) => <option key={year}>{year}</option>)}</select></label>
                      <label><span>Số chỗ</span><select value={draft.seats} onChange={(event) => setField("seats", event.target.value)}>{[4, 5, 6, 7].map((value) => <option value={value} key={value}>{value} chỗ</option>)}</select></label>
                      <label><span>Dòng xe</span><select value={draft.bodyType} onChange={(event) => setField("bodyType", event.target.value)}><option value="Sedan">Sedan</option><option value="SUV">SUV</option><option value="MPV">MPV</option><option value="Hatchback">Hatchback</option></select></label>
                      <label><span>Truyền động</span><select value={draft.transmission} onChange={(event) => setField("transmission", event.target.value)}><option value="Automatic">Số tự động</option><option value="Manual">Số sàn</option></select></label>
                      <label><span>Nhiên liệu</span><select value={draft.fuelType} onChange={(event) => setField("fuelType", event.target.value)}><option value="Gasoline">Xăng</option><option value="Diesel">Dầu diesel</option><option value="Electric">Điện</option><option value="Hybrid">Xăng và điện</option></select></label>
                      <label className="owner-field-wide"><span>Mô tả xe *</span><textarea value={draft.description} onChange={(event) => setField("description", event.target.value)} placeholder="Tình trạng xe, trải nghiệm lái và điểm phù hợp cho chuyến đi..." rows={5} /><FieldError>{errors.description}</FieldError></label>
                    </div>
                    <fieldset className="owner-feature-fieldset"><legend>Tiện nghi xe</legend><p>Chọn những tiện nghi hiện có trên xe của bạn.</p><div>{amenities.map(({ label, icon: Icon }) => <label key={label} className={draft.features.includes(label) ? "is-selected" : ""}><input type="checkbox" checked={draft.features.includes(label)} onChange={() => toggleFeature(label)} /><Icon className="owner-feature-icon" size={27} weight="regular" /><span>{label}</span><CheckCircle className="owner-feature-check" size={18} weight="fill" /></label>)}</div></fieldset>
                  </>
                ) : null}

                {step === 2 ? (
                  <div className="owner-mioto-rental">
                    <section className="owner-mioto-section owner-mioto-pricing">
                      <h2>Đơn giá thuê mặc định</h2>
                      <p>Đơn giá áp dụng cho tất cả các ngày.</p>
                      <div className="owner-mioto-price-grid">
                        <label><span>Giá thuê theo giờ *</span><small>Giá đề xuất: 120K</small><div className="owner-price-input"><input type="number" min="50000" step="10000" value={draft.hourPrice} onChange={(event) => setField("hourPrice", event.target.value)} placeholder="120000" /><b>đ/giờ</b></div><FieldError>{errors.hourPrice}</FieldError></label>
                        <label><span>Giá thuê theo ngày *</span><small>Giá đề xuất: 700K</small><div className="owner-price-input"><input type="number" min="300000" step="10000" value={draft.dayPrice} onChange={(event) => setField("dayPrice", event.target.value)} placeholder="700000" /><b>đ/ngày</b></div><FieldError>{errors.dayPrice}</FieldError></label>
                      </div>
                    </section>
                    <section className="owner-mioto-section owner-mioto-discount">
                      <div className="owner-mioto-title-row"><h2>Giảm giá</h2><label className="owner-toggle"><input aria-label="Bật giảm giá thuê tuần" type="checkbox" checked={draft.weeklyDiscountEnabled} onChange={(event) => { setDraft((current) => ({ ...current, weeklyDiscountEnabled: event.target.checked })); setErrors((current) => ({ ...current, weeklyDiscountPercent: "" })); }} /><span aria-hidden="true" /></label></div>
                      <label className="owner-discount-label" htmlFor="weekly-discount">Giảm giá thuê tuần (% trên đơn giá)</label>
                      <div className={`owner-mioto-slider${draft.weeklyDiscountEnabled ? " is-enabled" : ""}`}><input id="weekly-discount" aria-label="Phần trăm giảm giá thuê tuần" type="range" min="5" max="30" step="1" value={draft.weeklyDiscountPercent} disabled={!draft.weeklyDiscountEnabled} style={rangeStyle(draft.weeklyDiscountPercent, 5, 30, draft.weeklyDiscountEnabled)} onChange={(event) => setField("weeklyDiscountPercent", event.target.value)} /><strong>{draft.weeklyDiscountEnabled ? draft.weeklyDiscountPercent : 0}%</strong></div>
                      <p className="owner-discount-suggestion">Giảm đề xuất: 10%</p>
                      <p className="owner-discount-note">Áp dụng tự động khi khách thuê từ 7 ngày và chỉ tính trên đơn giá theo ngày.</p>
                      <FieldError>{errors.weeklyDiscountPercent}</FieldError>
                    </section>
                    <section className="owner-mioto-section owner-mioto-address">
                      <h2>Địa chỉ xe</h2>
                      <label><span>Địa chỉ nhận xe *</span><div><input value={draft.pickupAddress} onChange={(event) => setField("pickupAddress", event.target.value)} placeholder="Địa chỉ mặc định để nhận và trả xe" /><MapPin size={21} /></div><FieldError>{errors.pickupAddress}</FieldError></label>
                    </section>
                    <section className="owner-mioto-section owner-mioto-mileage">
                      <div className="owner-mioto-title-row"><h2>Giới hạn số km</h2><label className="owner-toggle"><input aria-label="Bật giới hạn số km" type="checkbox" checked={draft.mileageLimitEnabled} onChange={(event) => { setDraft((current) => ({ ...current, mileageLimitEnabled: event.target.checked })); setErrors((current) => ({ ...current, dailyMileageLimit: "", overageFeePerKm: "" })); }} /><span aria-hidden="true" /></label></div>
                      <div className="owner-mileage-grid">
                        <div className="owner-mileage-control">
                          <label htmlFor="daily-mileage-limit">Số km tối đa trong 1 ngày</label>
                          <div className={`owner-mioto-slider${draft.mileageLimitEnabled ? " is-enabled" : ""}`}><input id="daily-mileage-limit" aria-label="Số km tối đa trong một ngày" type="range" min="100" max="800" step="50" value={draft.dailyMileageLimit} disabled={!draft.mileageLimitEnabled} style={rangeStyle(draft.dailyMileageLimit, 100, 800, draft.mileageLimitEnabled)} onChange={(event) => setField("dailyMileageLimit", event.target.value)} /><strong>{draft.mileageLimitEnabled ? draft.dailyMileageLimit : 0}km</strong></div>
                          <p>Số km đề xuất: 400km</p>
                          <FieldError>{errors.dailyMileageLimit}</FieldError>
                        </div>
                        <div className="owner-mileage-control">
                          <label htmlFor="overage-fee">Phí vượt giới hạn (tính mỗi km)</label>
                          <div className={`owner-mioto-slider${draft.mileageLimitEnabled ? " is-enabled" : ""}`}><input id="overage-fee" aria-label="Phí vượt giới hạn tính mỗi km" type="range" min="1000" max="10000" step="500" value={draft.overageFeePerKm} disabled={!draft.mileageLimitEnabled} style={rangeStyle(draft.overageFeePerKm, 1000, 10000, draft.mileageLimitEnabled)} onChange={(event) => setField("overageFeePerKm", event.target.value)} /><strong>{draft.mileageLimitEnabled ? Number(draft.overageFeePerKm) / 1000 : 0}K</strong></div>
                          <p>Phí đề xuất: 3K</p>
                          <FieldError>{errors.overageFeePerKm}</FieldError>
                        </div>
                      </div>
                    </section>
                    <section className="owner-mioto-section owner-mioto-terms">
                      <h2>Điều khoản thuê xe</h2>
                      <p>Ghi rõ các yêu cầu để khách có thể thuê xe.</p>
                      <label htmlFor="rental-terms" className="sr-only">Điều khoản thuê xe</label>
                      <textarea id="rental-terms" value={draft.rentalTerms} onChange={(event) => setField("rentalTerms", event.target.value)} placeholder="Không sử dụng xe vào mục đích phi pháp. Lái xe cẩn thận, giữ xe sạch sẽ, trả xe đúng giờ. Phụ thu 500K nếu hút thuốc lá trong xe." rows={5} />
                      <FieldError>{errors.rentalTerms}</FieldError>
                    </section>
                  </div>
                ) : null}

                {step === 3 ? (
                  <>
                    <div className="owner-form-section-heading"><ImageSquare size={25} weight="duotone" /><div><h2>Hình ảnh</h2><p>Đăng nhiều hình ở các góc độ khác nhau để tăng thông tin cho xe của bạn.</p></div></div>
                    <div className="owner-upload-section owner-vehicle-gallery">
                      <div className="owner-gallery-meta"><p>{editId ? "Giữ ảnh hiện tại hoặc chọn ảnh mới để thay toàn bộ ảnh. Ảnh đầu tiên là ảnh đại diện." : "Chọn từ 1 đến 8 ảnh. Ảnh đầu tiên là ảnh đại diện."}</p><strong>{vehicleImages.length || existingImages.length}/8</strong></div>
                      <div className="owner-image-preview-grid">
                        {vehicleImages.length < 8 ? <label className="owner-add-image-tile"><Camera size={34} weight="duotone" /><strong>CHỌN HÌNH</strong><span>JPG, PNG, WebP</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={onVehicleImages} /></label> : null}
                        {vehicleImages.length === 0 ? existingImages.map((url, index) => <figure key={url}><img src={url} alt={`Ảnh xe hiện tại ${index + 1}`} />{index === 0 ? <span>Ảnh đại diện</span> : null}</figure>) : null}
                        {vehicleImageUrls.map((url, index) => <figure key={url}><button className="owner-image-main-action" type="button" onClick={() => makeCover(index)} aria-label={`Đặt ảnh ${index + 1} làm ảnh đại diện`}><img src={url} alt={`Ảnh xe ${index + 1}`} /></button>{index === 0 ? <span>Ảnh đại diện</span> : null}<button className="owner-image-delete" type="button" aria-label={`Xóa ảnh ${index + 1}`} onClick={() => setVehicleImages((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash /></button></figure>)}
                      </div>
                      <FieldError>{errors.vehicleImages}</FieldError>
                    </div>
                    {submitError ? <div className="owner-submit-error" role="alert">{submitError}</div> : null}
                  </>
                ) : null}
              </motion.div>
            </AnimatePresence>

            <div className="owner-form-actions">
              {step > 1 ? <button className="owner-secondary-button" type="button" onClick={() => setStep((current) => Math.max(1, current - 1) as RegisterStep)}><ArrowLeft /> Quay lại</button> : <a className="owner-secondary-button" href="/become-owner"><ArrowLeft /> Quay lại</a>}
              {step < 3 ? <button key="next" className="owner-primary-button" type="button" onClick={next}>Kế tiếp <ArrowRight /></button> : <button key="submit" className="owner-primary-button" type="submit" disabled={submitting}>{submitting ? "Đang gửi..." : editId ? "Gửi lại hồ sơ" : "Đăng ký"} <CheckCircle weight="fill" /></button>}
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
