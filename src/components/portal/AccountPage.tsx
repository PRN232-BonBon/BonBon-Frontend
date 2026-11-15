import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, CheckCircle, IdentificationCard, PencilSimple, UploadSimple } from "@phosphor-icons/react";
import { useAuth } from "../../auth/AuthContext";
import { captureUserWriter, readUserValue, subscribeUserStore } from "../../auth/user-store";
import { getMyBookings, getProfile, updateProfile, type AccountProfile } from "../../portal/portal-api";

const LICENSE_KEY = "license.preview";
const COMPLETED_STATUSES = new Set(["Completed"]);

export function AccountPage() {
  const { session, refreshPermissions } = useAuth();
  const accountId = session?.account.accountId;

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [form, setForm] = useState({ fullName: "", displayName: "", phone: "" });
  const [completedTrips, setCompletedTrips] = useState<number | null>(null);

  const [licenseImage, setLicenseImage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Đọc lại dữ liệu GPLX khi tài khoản đổi (namespace theo accountId).
  useEffect(() => {
    setLicenseImage(readUserValue<string | null>(LICENSE_KEY, null));
    return subscribeUserStore(() => {
      setLicenseImage(readUserValue<string | null>(LICENSE_KEY, null));
    });
  }, [accountId]);

  // Nạp hồ sơ thật từ server: ngày tham gia, số điện thoại, có mật khẩu hay không.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    getProfile(session)
      .then((data) => {
        if (cancelled) return;
        setProfile(data);
        if (data.roles.includes("VehicleOwner") && !session.account.roles.includes("VehicleOwner")) {
          void refreshPermissions().catch(() => {
            if (!cancelled) setMessage({ type: "error", text: "Chưa thể cập nhật quyền chủ xe. Vui lòng tải lại trang hoặc đăng nhập lại." });
          });
        }
        setForm({
          fullName: data.fullName,
          displayName: data.displayName ?? "",
          phone: data.phone ?? "",
        });
      })
      .catch(() => { if (!cancelled) setProfile(null); });
    return () => { cancelled = true; };
  }, [session]);

  // Check an account waiting for its first vehicle approval without resetting form edits.
  useEffect(() => {
    if (!session || session.account.roles.includes("VehicleOwner")) return;
    let cancelled = false;
    let checking = false;
    const check = async () => {
      if (checking) return;
      checking = true;
      try {
        const latest = await getProfile(session);
        if (!cancelled && latest.roles.includes("VehicleOwner")) await refreshPermissions();
      } catch { /* Retry on the next check; the existing session stays usable. */ }
      finally { checking = false; }
    };
    const timer = window.setInterval(() => void check(), 30_000);
    const onVisible = () => { if (!document.hidden) void check(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { cancelled = true; window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [session]);

  // Số chuyến hoàn thành lấy từ dữ liệu booking thật, không hardcode.
  useEffect(() => {
    if (!session) { setCompletedTrips(null); return; }
    let cancelled = false;
    getMyBookings(session)
      .then((bookings) => {
        if (cancelled) return;
        setCompletedTrips(bookings.filter((booking) => COMPLETED_STATUSES.has(booking.status)).length);
      })
      .catch(() => { if (!cancelled) setCompletedTrips(null); });
    return () => { cancelled = true; };
  }, [session]);

  const joined = useMemo(() => {
    const createdAt = profile?.createdAt;
    if (!createdAt) return null;
    return new Intl.DateTimeFormat("vi-VN", { month: "2-digit", year: "numeric" }).format(new Date(createdAt));
  }, [profile?.createdAt]);

  const onLicense = useCallback((file?: File) => {
    if (!file) return;
    const writeLicense = captureUserWriter<string>(LICENSE_KEY);
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result);
      if (writeLicense(value)) setLicenseImage(value);
    };
    reader.readAsDataURL(file);
  }, []);

  const save = async () => {
    if (!session) return;
    setSaving(true);
    setMessage(null);
    try {
      const updated = await updateProfile(session, {
        displayName: form.displayName.trim() || null,
        phone: form.phone.trim() || null,
      });
      setProfile(updated);
      setEditing(false);
      setMessage({ type: "ok", text: "Đã lưu thông tin tài khoản." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Không thể lưu thông tin." });
    } finally {
      setSaving(false);
    }
  };

  const account = session?.account;

  return (
    <>
      <div className="portal-title-row"><h1>Tài khoản của tôi</h1></div>
      <p><a className="icon-text-button" href="/owner/cars">Xem hồ sơ đăng ký xe của tôi</a></p>
      <article className="portal-card account-card">
        <div className="card-heading">
          <div><h2>Thông tin tài khoản</h2><p>Quản lý thông tin để bảo mật tài khoản của bạn.</p></div>
          {editing
            ? <button className="icon-text-button" type="button" onClick={save} disabled={saving}>{saving ? "Đang lưu..." : "Lưu thay đổi"}</button>
            : <button className="icon-text-button" type="button" onClick={() => { setEditing(true); setMessage(null); }}><PencilSimple size={18} /> Chỉnh sửa</button>}
        </div>
        {message ? <div className={`form-message ${message.type}`} role="alert">{message.type === "ok" ? <CheckCircle weight="fill" /> : null}{message.text}</div> : null}
        <div className="account-grid">
          <div className="profile-summary">
            <div className="profile-avatar"><span>{(account?.fullName || "BB").slice(0, 2).toUpperCase()}</span><button type="button" aria-label="Đổi ảnh đại diện"><Camera size={17} /></button></div>
            <h3>{account?.displayName || account?.fullName}</h3>
            {joined ? <p>Thành viên từ {joined}</p> : null}
            <div className="trip-stat"><strong>{completedTrips ?? "—"}</strong><span>Chuyến đã hoàn thành</span></div>
          </div>
          <div className="profile-fields">
            <label><span>Họ và tên</span><input disabled value={account?.fullName} /></label>
            <label><span>Tên hiển thị</span><input disabled={!editing} value={form.displayName} placeholder="Chưa cập nhật" onChange={(event) => setForm({ ...form, displayName: event.target.value })} /></label>
            <label><span>Số điện thoại</span><div className="verified-field"><input disabled={!editing} value={form.phone} placeholder="Chưa cập nhật" onChange={(event) => setForm({ ...form, phone: event.target.value })} />{form.phone ? <small>Đã cập nhật</small> : <small>Chưa cập nhật</small>}</div></label>
            <label><span>Email</span><div className="verified-field"><input disabled value={account?.email} /><small className="verified"><CheckCircle weight="fill" /> Đã đăng ký</small></div></label>
            <label><span>Phương thức đăng nhập</span><div className="verified-field"><input disabled value={profile?.hasPassword ? "Email và mật khẩu" : "Google"} /><small>{profile?.hasPassword ? "Có thể đổi mật khẩu" : "Tài khoản Google — chưa có mật khẩu"}</small></div></label>
          </div>
        </div>
      </article>

      <article className="portal-card license-card">
        <div className="card-heading">
          <div><h2>Giấy phép lái xe</h2><p>Giấy phép hợp lệ giúp quá trình nhận xe nhanh chóng hơn.</p></div>
          <span className="status-pill">Chưa xác thực</span>
        </div>
        <div className="notice-strip"><IdentificationCard size={22} /> Ảnh chụp phải rõ nét, đủ bốn góc và thông tin trùng khớp với tài khoản.</div>
        <div className="license-upload" onClick={() => fileRef.current?.click()} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}>
          {licenseImage ? <img src={licenseImage} alt="Ảnh mặt trước giấy phép lái xe" /> : <><UploadSimple size={34} /><strong>Ảnh mặt trước GPLX</strong><span>Nhấn để chọn ảnh JPG hoặc PNG</span></>}
          <input ref={fileRef} hidden type="file" accept="image/png,image/jpeg" onChange={(e) => onLicense(e.target.files?.[0])} />
        </div>
      </article>
    </>
  );
}
