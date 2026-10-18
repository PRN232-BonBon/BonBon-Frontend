import { useMemo, useState } from "react";
import { House, MapPin, Plus, Trash } from "@phosphor-icons/react";
import { EmptyState } from "./EmptyState";

type Address = { id: string; type: string; label: string; city: string; district: string; ward: string; detail: string; isDefault: boolean };
const locations: Record<string, Record<string, string[]>> = {
  "TP. Hồ Chí Minh": { "Quận 1": ["Phường Bến Nghé", "Phường Bến Thành", "Phường Đa Kao"], "Quận 3": ["Phường Võ Thị Sáu", "Phường 9", "Phường 12"], "TP. Thủ Đức": ["Phường Thảo Điền", "Phường An Phú", "Phường Linh Trung"] },
  "Hà Nội": { "Quận Hoàn Kiếm": ["Phường Hàng Bạc", "Phường Tràng Tiền", "Phường Cửa Nam"], "Quận Cầu Giấy": ["Phường Dịch Vọng", "Phường Yên Hòa", "Phường Mai Dịch"] },
  "Đà Nẵng": { "Quận Hải Châu": ["Phường Hải Châu I", "Phường Hòa Cường Bắc"], "Quận Sơn Trà": ["Phường An Hải Bắc", "Phường Phước Mỹ"] },
  "Bình Dương": { "TP. Thủ Dầu Một": ["Phường Phú Cường", "Phường Hiệp Thành"], "TP. Dĩ An": ["Phường Dĩ An", "Phường Đông Hòa"] },
  "Đà Lạt": { "Trung tâm Đà Lạt": ["Phường 1", "Phường 2", "Phường 3"], "Khu Trại Mát": ["Phường 11", "Phường 12"] },
  "Hạ Long": { "Khu Bãi Cháy": ["Phường Bãi Cháy", "Phường Hùng Thắng"], "Khu Hòn Gai": ["Phường Bạch Đằng", "Phường Hồng Gai"] },
};
const emptyForm = { type: "Nhà riêng", label: "", city: "", district: "", ward: "", detail: "", isDefault: false };

export function AddressesPage() {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [addresses, setAddresses] = useState<Address[]>(() => { try { return JSON.parse(localStorage.getItem("bonbon.addresses") || "[]"); } catch { return []; } });
  const districts = useMemo(() => form.city ? Object.keys(locations[form.city]) : [], [form.city]);
  const wards = useMemo(() => form.city && form.district ? locations[form.city][form.district] : [], [form.city, form.district]);
  const valid = form.label.trim() && form.city && form.district && form.ward && form.detail.trim();
  const save = () => {
    if (!valid) return;
    let next = [...addresses, { ...form, id: crypto.randomUUID() }];
    if (form.isDefault) next = next.map((item, index) => ({ ...item, isDefault: index === next.length - 1 }));
    localStorage.setItem("bonbon.addresses", JSON.stringify(next)); setAddresses(next); setAdding(false); setForm(emptyForm);
  };
  const remove = (id: string) => { const next = addresses.filter((item) => item.id !== id); localStorage.setItem("bonbon.addresses", JSON.stringify(next)); setAddresses(next); };

  return <><div className="portal-title-row"><h1>Địa chỉ của tôi</h1></div><article className="portal-card address-card">{adding ? <><div className="card-heading"><div><h2>Thêm địa chỉ mới</h2><p>Lưu địa chỉ để nhận xe thuận tiện hơn.</p></div></div><div className="address-form"><div className="address-type-row"><div className="segmented">{["Nhà riêng", "Công ty", "Khác"].map((type) => <button className={form.type === type ? "active" : ""} onClick={() => setForm({ ...form, type })} type="button" key={type}>{type}</button>)}</div><label className="toggle-label"><input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} /><span />Đặt làm mặc định</label></div><label><span>Tên gợi nhớ</span><input placeholder="Ví dụ: Nhà riêng" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} /></label><div className="address-selects"><label><span>Thành phố</span><select value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value, district: "", ward: "" })}><option value="">Chọn thành phố</option>{Object.keys(locations).map((city) => <option key={city}>{city}</option>)}</select></label><label><span>Quận/Huyện</span><select disabled={!form.city} value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value, ward: "" })}><option value="">Chọn quận/huyện</option>{districts.map((district) => <option key={district}>{district}</option>)}</select></label><label><span>Phường/Xã</span><select disabled={!form.district} value={form.ward} onChange={(e) => setForm({ ...form, ward: e.target.value })}><option value="">Chọn phường/xã</option>{wards.map((ward) => <option key={ward}>{ward}</option>)}</select></label></div><label><span>Địa chỉ cụ thể</span><input placeholder="Số nhà, tên đường" value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} /></label><div className="form-actions"><button className="button button-outline" type="button" onClick={() => { setAdding(false); setForm(emptyForm); }}>Hủy</button><button className="button portal-primary" type="button" disabled={!valid} onClick={save}>Xác nhận</button></div></div></> : <><div className="card-heading"><div><h2>Địa chỉ đã lưu</h2><p>Quản lý các địa chỉ nhận và trả xe thường dùng.</p></div><button className="button portal-primary" type="button" onClick={() => setAdding(true)}><Plus size={18} weight="bold" /> Thêm địa chỉ mới</button></div>{addresses.length === 0 ? <EmptyState image="/assets/portal/empty-addresses.webp" title="Bạn chưa có địa chỉ" description="Thêm địa chỉ thường dùng để đặt xe nhanh hơn." /> : <div className="saved-address-list">{addresses.map((address) => <div className="saved-address" key={address.id}><div className="saved-icon">{address.type === "Nhà riêng" ? <House /> : <MapPin />}</div><div><div><strong>{address.label}</strong>{address.isDefault ? <span>Mặc định</span> : null}</div><p>{address.detail}, {address.ward}, {address.district}, {address.city}</p></div><button aria-label="Xóa địa chỉ" type="button" onClick={() => remove(address.id)}><Trash /></button></div>)}</div>}</>}</article></>;
}
