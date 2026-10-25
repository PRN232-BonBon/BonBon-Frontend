import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowClockwise, ArrowLeft, ArrowRight, CarProfile, Check, CheckCircle, Clock, Eye, EyeSlash, MagnifyingGlass, ShieldCheck, SignOut, UserCircle, X, XCircle } from "@phosphor-icons/react";
import type { AuthSession } from "../auth/auth-api";
import logo from "../../public/assets/brand/bonbon-logo-cropped.webp";
import { adminLogin, adminLogout, getReviewVehicles, readAdminSession, reviewVehicle, vehicleImageUrl, type ReviewVehicle } from "./admin-api";

const money = (value: number) => `${new Intl.NumberFormat("vi-VN").format(value)}đ`;
const date = (value: string) => new Date(value).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
const statuses: Record<string, string> = { PendingApproval: "Chờ duyệt", Available: "Đã duyệt", Rejected: "Từ chối", Suspended: "Tạm ngưng", Archived: "Đã lưu trữ", Draft: "Bản nháp" };
const fuelNames: Record<string, string> = { Gasoline: "Xăng", Diesel: "Dầu diesel", Electric: "Điện", Hybrid: "Xăng và điện" };
const filters = ["PendingApproval", "Available", "Rejected", "all"];

function Brand() { return <div className="admin-brand"><img src={logo} alt="BonBon" /><span>ADMIN</span></div>; }
function Status({ value }: { value: string }) { return <span className={`admin-status status-${value}`}>{statuses[value] || value}</span>; }

function Login({ onLogin }: { onLogin: (session: AuthSession) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try { onLogin(await adminLogin(username.trim(), password)); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Không thể đăng nhập."); }
    finally { setBusy(false); }
  };
  return <div className="admin-login-page">
    <header><Brand /><a href="https://bonbon.kitsuracloud.com"><ArrowLeft /> Về BonBon</a></header>
    <main className="admin-login-main"><div className="admin-login-intro"><span className="admin-login-icon"><ShieldCheck size={34} weight="duotone" /></span><h1>Quản trị BonBon</h1><p>Kiểm tra thông tin, duyệt xe và sẵn sàng<br />cho những hành trình mới.</p></div>
      <form className="admin-login-form" onSubmit={submit}>
        <h2>Đăng nhập quản trị</h2><p>Sử dụng tài khoản quản trị được cấp.</p>
        <label>Tên đăng nhập<input autoComplete="username" name="username" type="text" placeholder="bonbon@admin" required value={username} onChange={event => setUsername(event.target.value)} /></label>
        <label>Mật khẩu<div className="admin-password"><input autoComplete="current-password" name="password" type={showPassword ? "text" : "password"} placeholder="Nhập mật khẩu" required value={password} onChange={event => setPassword(event.target.value)} /><button type="button" aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeSlash /> : <Eye />}</button></div></label>
        {error && <p className="admin-error" role="alert">{error}</p>}
        <button className="admin-button primary" type="submit" disabled={busy}>{busy ? "Đang đăng nhập…" : "Đăng nhập"}<ArrowRight /></button>
      </form>
    </main><footer>BonBon · Khu vực dành cho quản trị viên</footer>
  </div>;
}

function VehicleDetail({ vehicle, onClose, onReviewed }: { vehicle: ReviewVehicle; onClose: () => void; onReviewed: () => Promise<void> }) {
  const [activeImage, setActiveImage] = useState(0);
  const [confirmation, setConfirmation] = useState<"approve" | "reject" | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden"; closeRef.current?.focus();
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) { if (confirmation) setConfirmation(null); else onClose(); }
      if (event.key === "Tab") {
        const nodes = panelRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), textarea, [href]');
        if (!nodes?.length) return;
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key);
  }, [busy, confirmation, onClose]);
  const decide = async () => {
    if (!confirmation) return;
    if (confirmation === "reject" && !reason.trim()) { setError("Vui lòng nhập lý do từ chối."); return; }
    setBusy(true); setError("");
    try { await reviewVehicle(vehicle.id, confirmation, reason.trim()); await onReviewed(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Không thể xử lý xe."); }
    finally { setBusy(false); }
  };
  return <div className="admin-detail-overlay" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <section className="admin-detail" role="dialog" aria-modal="true" aria-labelledby="review-title" ref={panelRef}>
      <header><div><span>Hồ sơ đăng ký xe</span><h2 id="review-title">{vehicle.brand} {vehicle.model} {vehicle.year}</h2></div><button className="admin-icon-button" ref={closeRef} type="button" onClick={onClose} disabled={busy} aria-label="Đóng hồ sơ"><X size={22} /></button></header>
      <div className="admin-detail-scroll">
        <div className="admin-detail-status"><Status value={vehicle.status} /><span>Đăng ký {date(vehicle.submittedAt)}</span></div>
        {vehicle.imageUrls.length ? <div className="admin-review-gallery"><img className="admin-review-main-image" src={vehicleImageUrl(vehicle.imageUrls[activeImage])} alt={`Ảnh ${activeImage + 1} của ${vehicle.brand} ${vehicle.model}`} /><div>{vehicle.imageUrls.map((url, index) => <button key={url} type="button" className={activeImage === index ? "selected" : ""} onClick={() => setActiveImage(index)} aria-label={`Xem ảnh ${index + 1}`} aria-pressed={activeImage === index}><img src={vehicleImageUrl(url)} alt={`Góc chụp ${index + 1}`} /></button>)}</div><small>{activeImage + 1} / {vehicle.imageUrls.length} ảnh</small></div> : <div className="admin-no-image"><CarProfile size={40} />Chưa có ảnh xe</div>}
        <section className="admin-detail-section"><h3>Thông tin xe</h3><dl className="admin-specs">
          {[['Biển số', vehicle.plateNumber], ['Hãng xe', vehicle.brand], ['Mẫu xe', vehicle.model], ['Năm sản xuất', vehicle.year || '—'], ['Dòng xe', vehicle.bodyType], ['Số chỗ', `${vehicle.seats} chỗ`], ['Truyền động', vehicle.transmission === 'Automatic' ? 'Số tự động' : 'Số sàn'], ['Nhiên liệu', fuelNames[vehicle.fuel] || vehicle.fuel]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl><p className="admin-description">{vehicle.description || "Chưa có mô tả."}</p>
        <div className="admin-amenities">{vehicle.features.map(feature => <span key={feature}><Check size={14} />{feature}</span>)}</div></section>
        <section className="admin-detail-section"><h3>Chủ xe</h3><div className="admin-owner-box"><UserCircle size={38} weight="duotone" /><div><strong>{vehicle.ownerName}</strong><span>{vehicle.ownerEmail}</span><span>{vehicle.ownerPhone || "Chưa cung cấp số điện thoại"}</span></div></div></section>
        <section className="admin-detail-section"><h3>Thông tin cho thuê</h3><div className="admin-prices"><div><span>Theo giờ</span><strong>{money(vehicle.hourPrice)}<small> / giờ</small></strong></div><div><span>Theo ngày</span><strong>{money(vehicle.dayPrice)}<small> / ngày</small></strong></div></div>
          <dl className="admin-rental-info"><div><dt>Địa chỉ nhận xe</dt><dd>{vehicle.pickupAddress}</dd></div><div><dt>Giảm giá thuê tuần</dt><dd>{vehicle.weeklyDiscountEnabled ? `${vehicle.weeklyDiscountPercent}% khi thuê từ 7 ngày` : "Không áp dụng"}</dd></div><div><dt>Giới hạn quãng đường</dt><dd>{vehicle.mileageLimitEnabled ? `${vehicle.dailyMileageLimitKm} km/ngày · Vượt giới hạn ${money(vehicle.overageFeePerKm || 0)}/km` : "Không giới hạn"}</dd></div><div><dt>Điều khoản thuê xe</dt><dd>{vehicle.rentalTerms || "Chưa có điều khoản bổ sung."}</dd></div></dl>
        </section>
        {vehicle.rejectionReason && <section className="admin-rejection"><h3>Lý do từ chối</h3><p>{vehicle.rejectionReason}</p></section>}
        {vehicle.reviewedAt && <p className="admin-reviewed-date">Đã xử lý lúc {date(vehicle.reviewedAt)}</p>}
      </div>
      <footer className="admin-review-actions">
        {error && <p className="admin-error" role="alert">{error}</p>}
        {vehicle.status === "PendingApproval" ? confirmation ? <div className="admin-review-confirmation">
          <h3>{confirmation === "approve" ? "Duyệt cho thuê xe này?" : "Từ chối hồ sơ xe"}</h3>
          {confirmation === "approve" ? <p>Xe sẽ xuất hiện trong danh sách cho thuê của BonBon.</p> : <label>Lý do từ chối<textarea maxLength={1000} rows={3} value={reason} onChange={event => { setReason(event.target.value); setError(""); }} placeholder="Ví dụ: Ảnh xe chưa rõ, vui lòng bổ sung ảnh ngoại thất." autoFocus /></label>}
          <div><button className="admin-button secondary" disabled={busy} type="button" onClick={() => { setConfirmation(null); setError(""); }}>Quay lại</button><button className={`admin-button ${confirmation === "approve" ? "primary" : "danger"}`} type="button" disabled={busy} onClick={() => void decide()}>{busy ? "Đang xử lý…" : confirmation === "approve" ? "Xác nhận duyệt" : "Xác nhận từ chối"}</button></div>
        </div> : <><span>Kiểm tra thông tin trước khi duyệt.</span><div><button className="admin-button secondary" type="button" onClick={() => setConfirmation("reject")}><XCircle />Từ chối</button><button className="admin-button primary" type="button" onClick={() => setConfirmation("approve")}><CheckCircle />Duyệt xe</button></div></> : <><span>Hồ sơ đã được xử lý.</span><button className="admin-button secondary" type="button" onClick={onClose}>Đóng hồ sơ</button></>}
      </footer>
    </section>
  </div>;
}

export function AdminApp() {
  const [session, setSession] = useState<AuthSession | null>(() => readAdminSession());
  const [vehicles, setVehicles] = useState<ReviewVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("PendingApproval");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ReviewVehicle | null>(null);
  const [toast, setToast] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setVehicles(await getReviewVehicles()); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Không thể tải danh sách xe."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { if (session) void load(); }, [session, load]);
  useEffect(() => { const expired = () => { setSession(null); setVehicles([]); setSelected(null); }; window.addEventListener("bonbon-admin:expired", expired); return () => window.removeEventListener("bonbon-admin:expired", expired); }, []);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(""), 5000); return () => window.clearTimeout(timer); }, [toast]);
  if (!session) return <Login onLogin={setSession} />;
  const pending = vehicles.filter(vehicle => vehicle.status === "PendingApproval").length;
  const available = vehicles.filter(vehicle => vehicle.status === "Available").length;
  const rejected = vehicles.filter(vehicle => vehicle.status === "Rejected").length;
  const query = search.trim().toLocaleLowerCase("vi");
  const visible = vehicles.filter(vehicle => (filter === "all" || vehicle.status === filter) && `${vehicle.brand} ${vehicle.model} ${vehicle.plateNumber} ${vehicle.ownerName}`.toLocaleLowerCase("vi").includes(query));
  return <div className="admin-shell">
    <aside className="admin-sidebar"><Brand /><span className="admin-nav-label">QUẢN LÝ</span><button className="admin-nav-item" type="button" onClick={() => { setFilter("PendingApproval"); setSearch(""); }}><CarProfile size={22} weight="duotone" />Duyệt xe<span>{pending}</span></button><div className="admin-sidebar-bottom"><a href="https://bonbon.kitsuracloud.com" target="_blank" rel="noreferrer"><ArrowLeft size={18} />Trang khách hàng</a><p>BonBon Administration</p></div></aside>
    <div className="admin-workspace"><header className="admin-topbar"><div>Quản trị <span>/</span> Duyệt xe</div><div className="admin-account"><span className="admin-avatar"><ShieldCheck size={20} weight="duotone" /></span><div><strong>{session.account.displayName || session.account.fullName}</strong><span>Quản trị viên</span></div><button className="admin-icon-button" type="button" aria-label="Đăng xuất" onClick={() => { void adminLogout(); setSession(null); setVehicles([]); }}><SignOut size={21} /></button></div></header>
      <main className="admin-content"><div className="admin-page-heading"><div><h1>Duyệt xe</h1><p>Kiểm tra và phê duyệt xe đăng ký cho thuê trên BonBon.</p></div><button className="admin-button secondary" type="button" disabled={loading} onClick={() => void load()}><ArrowClockwise className={loading ? "is-spinning" : ""} />Làm mới</button></div>
        <div className="admin-stats">{[{label:'Chờ duyệt', count:pending, icon:Clock, status:'PendingApproval'}, {label:'Đã duyệt', count:available, icon:CheckCircle, status:'Available'}, {label:'Đã từ chối', count:rejected, icon:XCircle, status:'Rejected'}].map(({label,count,icon:Icon,status}) => <button key={status} type="button" className={filter === status ? "active" : ""} onClick={() => setFilter(status)}><span className={`admin-stat-icon status-${status}`}><Icon size={24} weight="duotone" /></span><div><span>{label}</span><strong>{loading && !vehicles.length ? '—' : count}<small> xe</small></strong></div><ArrowRight size={18} /></button>)}</div>
        <section className="admin-list-section" aria-label="Danh sách xe"><div className="admin-list-toolbar"><nav aria-label="Lọc trạng thái">{filters.map(status => <button key={status} type="button" className={filter === status ? "active" : ""} aria-pressed={filter === status} onClick={() => setFilter(status)}>{status === "all" ? "Tất cả" : statuses[status]}{status === "PendingApproval" && <span>{pending}</span>}</button>)}</nav><label className="admin-search"><MagnifyingGlass size={20} /><input aria-label="Tìm xe" placeholder="Tìm tên xe, biển số, chủ xe…" value={search} onChange={event => setSearch(event.target.value)} /></label></div>
          {error ? <div className="admin-list-error" role="alert"><XCircle size={30} /><p>{error}</p><button className="admin-button secondary" type="button" onClick={() => void load()}>Thử lại</button></div> : loading ? <div className="admin-list-loading" role="status">{[1,2,3].map(item => <div className="admin-skeleton" key={item}><span /><div /><div /><div /></div>)}<span>Đang tải danh sách xe…</span></div> : visible.length ? <table className="admin-vehicle-table"><thead><tr><th>Xe đăng ký</th><th>Chủ xe</th><th>Giá thuê</th><th>Trạng thái</th><th><span className="admin-sr-only">Thao tác</span></th></tr></thead><tbody>{visible.map(vehicle => <tr key={vehicle.id}><td><button className="admin-vehicle-title" type="button" onClick={() => setSelected(vehicle)}>{vehicle.imageUrls[0] ? <img src={vehicleImageUrl(vehicle.imageUrls[0])} alt={`${vehicle.brand} ${vehicle.model}`} /> : <span className="admin-car-placeholder"><CarProfile /></span>}<div><strong>{vehicle.brand} {vehicle.model} {vehicle.year}</strong><span>{vehicle.plateNumber} · {vehicle.seats} chỗ</span><small>{date(vehicle.submittedAt)}</small></div></button></td><td><div className="admin-cell-stack"><strong>{vehicle.ownerName}</strong><span>{vehicle.ownerPhone || vehicle.ownerEmail}</span></div></td><td><div className="admin-cell-stack"><strong>{money(vehicle.dayPrice)}<small> / ngày</small></strong><span>{money(vehicle.hourPrice)} / giờ</span></div></td><td><Status value={vehicle.status} /></td><td><button className="admin-row-action" type="button" onClick={() => setSelected(vehicle)}>Xem hồ sơ<ArrowRight size={16} /></button></td></tr>)}</tbody></table> : <div className="admin-empty"><span><CarProfile size={42} weight="duotone" /></span><h2>{search ? "Không tìm thấy xe" : filter === "PendingApproval" ? "Đã xử lý hết hồ sơ" : "Chưa có xe trong danh sách"}</h2><p>{search ? "Thử tìm bằng tên xe, biển số hoặc tên chủ xe khác." : filter === "PendingApproval" ? "Xe mới đăng ký sẽ xuất hiện ở đây để bạn kiểm tra và duyệt." : "Các hồ sơ phù hợp sẽ được hiển thị tại đây."}</p></div>}
          <footer className="admin-list-footer">{visible.length} xe {filter === "all" ? "trong hệ thống" : `· ${statuses[filter].toLocaleLowerCase("vi")}`}</footer>
        </section>
      </main><footer className="admin-workspace-footer">BonBon · Quản lý xe cho thuê</footer>
    </div>
    {selected && <VehicleDetail key={selected.id} vehicle={selected} onClose={() => setSelected(null)} onReviewed={async () => { setSelected(null); setToast("Đã cập nhật trạng thái hồ sơ xe."); await load(); }} />}
    {toast && <div className="admin-toast" role="status"><CheckCircle size={21} weight="fill" />{toast}<button type="button" aria-label="Đóng thông báo" onClick={() => setToast("")}><X /></button></div>}
  </div>;
}
