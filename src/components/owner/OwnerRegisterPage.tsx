import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from "react";
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
  FileText,
  ImageSquare,
  MapPin,
  Monitor,
  SecurityCamera,
  ShieldCheck,
  Tire,
  Trash,
  UploadSimple,
  Usb,
} from "@phosphor-icons/react";
import { useAuth } from "../../auth/AuthContext";

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
const years = Array.from({ length: 17 }, (_, index) => String(new Date().getFullYear() - index));

function FieldError({ children }: { children?: string }) {
  return children ? <small className="owner-field-error">{children}</small> : null;
}

function validateStep(step: RegisterStep, draft: VehicleDraft, vehicleImages: File[], registrationDocument: File | null) {
  const errors: Record<string, string> = {};
  if (step === 1) {
    if (!draft.plateNumber.trim()) errors.plateNumber = "Vui lòng nhập biển số xe.";
    if (!draft.brand) errors.brand = "Vui lòng chọn hãng xe.";
    if (!draft.model.trim()) errors.model = "Vui lòng nhập mẫu xe.";
    if (draft.description.trim().length < 20) errors.description = "Mô tả tối thiểu 20 ký tự.";
  }
  if (step === 2) {
    if (draft.pickupAddress.trim().length < 10) errors.pickupAddress = "Vui lòng nhập địa chỉ nhận xe đầy đủ.";
    if (!draft.hourPrice || Number(draft.hourPrice) < 50000) errors.hourPrice = "Giá theo giờ tối thiểu 50.000đ.";
    if (!draft.dayPrice || Number(draft.dayPrice) < 300000) errors.dayPrice = "Giá theo ngày tối thiểu 300.000đ.";
  }
  if (step === 3) {
    if (vehicleImages.length < 3) errors.vehicleImages = "Vui lòng tải lên ít nhất 3 ảnh xe.";
    if (!registrationDocument) errors.registrationDocument = "Vui lòng tải lên ảnh giấy đăng ký xe.";
  }
  return errors;
}

export function OwnerRegisterPage() {
  const [step, setStep] = useState<RegisterStep>(1);
  const [draft, setDraft] = useState<VehicleDraft>(initialDraft);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [vehicleImages, setVehicleImages] = useState<File[]>([]);
  const [registrationDocument, setRegistrationDocument] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const { session } = useAuth();
  const reduceMotion = useReducedMotion();

  const vehicleImageUrls = useMemo(() => vehicleImages.map((file) => URL.createObjectURL(file)), [vehicleImages]);
  const documentUrl = useMemo(() => registrationDocument ? URL.createObjectURL(registrationDocument) : null, [registrationDocument]);

  useEffect(() => () => {
    vehicleImageUrls.forEach((url) => URL.revokeObjectURL(url));
    if (documentUrl) URL.revokeObjectURL(documentUrl);
  }, [documentUrl, vehicleImageUrls]);

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
    const nextErrors = validateStep(step, draft, vehicleImages, registrationDocument);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setStep((current) => Math.min(3, current + 1) as RegisterStep);
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validateStep(3, draft, vehicleImages, registrationDocument);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    if (!session) {
      window.dispatchEvent(new CustomEvent("bonbon:open-auth", { detail: "login" }));
      return;
    }

    const registrations = JSON.parse(localStorage.getItem("bonbon.owner.vehicle-drafts") || "[]") as unknown[];
    localStorage.setItem("bonbon.owner.vehicle-drafts", JSON.stringify([
      ...registrations,
      { ...draft, status: "PendingReview", createdAt: new Date().toISOString(), imageCount: vehicleImages.length },
    ]));
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  const onVehicleImages = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []).filter((file) => file.type.startsWith("image/")).slice(0, 8);
    setVehicleImages(selected);
    setErrors((current) => ({ ...current, vehicleImages: "" }));
  };

  if (submitted) {
    return (
      <main className="owner-page owner-success-page">
        <motion.section className="owner-success" initial={reduceMotion ? false : { opacity: 0, scale: .97, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: .5, ease: [0.16, 1, 0.3, 1] }}>
          <span><CheckCircle size={54} weight="fill" /></span>
          <h1>Đã gửi đăng ký xe</h1>
          <p>BonBon đã nhận thông tin {draft.brand} {draft.model}. Hồ sơ đang chờ kiểm tra trước khi xe được hiển thị.</p>
          <div><a className="owner-primary-button" href="/cars">Xem danh sách xe</a><a className="owner-secondary-button" href="/">Về trang chủ</a></div>
        </motion.section>
      </main>
    );
  }

  return (
    <main className="owner-page owner-register-page">
      <div className="owner-container">
        <div className="owner-page-heading">
          <a href="/become-owner" aria-label="Quay lại"><ArrowLeft size={21} weight="bold" /> Quay lại</a>
          <h1>Đăng ký xe</h1>
        </div>

        <section className="owner-register-card">
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
                      <label><span>Số chỗ</span><select value={draft.seats} onChange={(event) => setField("seats", event.target.value)}>{[4, 5, 7].map((value) => <option value={value} key={value}>{value} chỗ</option>)}</select></label>
                      <label><span>Dòng xe</span><select value={draft.bodyType} onChange={(event) => setField("bodyType", event.target.value)}><option value="Sedan">Sedan</option><option value="SUV">SUV</option><option value="MPV">MPV</option><option value="Hatchback">Hatchback</option></select></label>
                      <label><span>Truyền động</span><select value={draft.transmission} onChange={(event) => setField("transmission", event.target.value)}><option value="Automatic">Số tự động</option><option value="Manual">Số sàn</option></select></label>
                      <label><span>Nhiên liệu</span><select value={draft.fuelType} onChange={(event) => setField("fuelType", event.target.value)}><option value="Gasoline">Xăng</option><option value="Diesel">Dầu diesel</option><option value="Electric">Điện</option><option value="Hybrid">Xăng và điện</option></select></label>
                      <label className="owner-field-wide"><span>Mô tả xe *</span><textarea value={draft.description} onChange={(event) => setField("description", event.target.value)} placeholder="Tình trạng xe, trải nghiệm lái và điểm phù hợp cho chuyến đi..." rows={5} /><FieldError>{errors.description}</FieldError></label>
                    </div>
                  </>
                ) : null}

                {step === 2 ? (
                  <>
                    <div className="owner-form-section-heading"><MapPin size={25} weight="duotone" /><div><h2>Thông tin cho thuê</h2><p>Chọn địa điểm nhận xe và mức giá rõ ràng cho khách thuê.</p></div></div>
                    <div className="owner-form-grid">
                      <label className="owner-field-wide"><span>Địa chỉ nhận xe *</span><input value={draft.pickupAddress} onChange={(event) => setField("pickupAddress", event.target.value)} placeholder="Số nhà, đường, phường/xã, quận/huyện, thành phố" /><FieldError>{errors.pickupAddress}</FieldError></label>
                      <label><span>Giá thuê theo giờ *</span><div className="owner-price-input"><input type="number" min="50000" step="10000" value={draft.hourPrice} onChange={(event) => setField("hourPrice", event.target.value)} placeholder="120000" /><b>đ/giờ</b></div><FieldError>{errors.hourPrice}</FieldError></label>
                      <label><span>Giá thuê theo ngày *</span><div className="owner-price-input"><input type="number" min="300000" step="10000" value={draft.dayPrice} onChange={(event) => setField("dayPrice", event.target.value)} placeholder="700000" /><b>đ/ngày</b></div><FieldError>{errors.dayPrice}</FieldError></label>
                    </div>
                    <fieldset className="owner-feature-fieldset"><legend>Tiện nghi xe</legend><p>Chọn những tiện nghi hiện có trên xe của bạn.</p><div>{amenities.map(({ label, icon: Icon }) => <label key={label} className={draft.features.includes(label) ? "is-selected" : ""}><input type="checkbox" checked={draft.features.includes(label)} onChange={() => toggleFeature(label)} /><Icon className="owner-feature-icon" size={27} weight="regular" /><span>{label}</span><CheckCircle className="owner-feature-check" size={18} weight="fill" /></label>)}</div></fieldset>
                  </>
                ) : null}

                {step === 3 ? (
                  <>
                    <div className="owner-form-section-heading"><ImageSquare size={25} weight="duotone" /><div><h2>Hình ảnh và giấy tờ</h2><p>Ảnh rõ nét giúp BonBon duyệt xe nhanh hơn và khách thuê dễ lựa chọn.</p></div></div>
                    <div className="owner-upload-section">
                      <div className="owner-upload-heading"><div><h3>Ảnh xe *</h3><p>Tải 3-8 ảnh ngoại thất và nội thất. Ảnh đầu tiên là ảnh đại diện.</p></div><label className="owner-upload-button"><UploadSimple size={19} /> Chọn ảnh<input type="file" accept="image/*" multiple onChange={onVehicleImages} /></label></div>
                      {vehicleImageUrls.length ? <div className="owner-image-preview-grid">{vehicleImageUrls.map((url, index) => <figure key={url}><img src={url} alt={`Ảnh xe ${index + 1}`} />{index === 0 ? <span>Ảnh đại diện</span> : null}<button type="button" aria-label={`Xóa ảnh ${index + 1}`} onClick={() => setVehicleImages((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash /></button></figure>)}</div> : <label className="owner-dropzone"><Camera size={42} weight="duotone" /><strong>Thêm ảnh xe của bạn</strong><span>JPG, PNG hoặc WebP, tối đa 8 ảnh</span><input type="file" accept="image/*" multiple onChange={onVehicleImages} /></label>}
                      <FieldError>{errors.vehicleImages}</FieldError>
                    </div>
                    <div className="owner-upload-section owner-document-section">
                      <div className="owner-upload-heading"><div><h3>Giấy đăng ký xe *</h3><p>Chỉ dùng để xác minh quyền sở hữu, không hiển thị công khai.</p></div><label className="owner-upload-button"><FileText size={19} /> Chọn ảnh<input type="file" accept="image/*" onChange={(event) => { setRegistrationDocument(event.target.files?.[0] || null); setErrors((current) => ({ ...current, registrationDocument: "" })); }} /></label></div>
                      {documentUrl ? <div className="owner-document-preview"><img src={documentUrl} alt="Ảnh giấy đăng ký xe" /><div><FileText size={24} /><span>{registrationDocument?.name}</span></div><button type="button" onClick={() => setRegistrationDocument(null)} aria-label="Xóa giấy đăng ký xe"><Trash /></button></div> : null}
                      <FieldError>{errors.registrationDocument}</FieldError>
                    </div>
                  </>
                ) : null}
              </motion.div>
            </AnimatePresence>

            <div className="owner-form-actions">
              {step > 1 ? <button className="owner-secondary-button" type="button" onClick={() => setStep((current) => Math.max(1, current - 1) as RegisterStep)}><ArrowLeft /> Quay lại</button> : <a className="owner-secondary-button" href="/become-owner"><ArrowLeft /> Quay lại</a>}
              {step < 3 ? <button className="owner-primary-button" type="button" onClick={next}>Kế tiếp <ArrowRight /></button> : <button className="owner-primary-button" type="submit">Gửi đăng ký <CheckCircle weight="fill" /></button>}
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
