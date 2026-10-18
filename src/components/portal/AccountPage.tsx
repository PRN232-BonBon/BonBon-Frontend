import { useMemo, useRef, useState } from "react";
import { Camera, CheckCircle, IdentificationCard, PencilSimple, UploadSimple } from "@phosphor-icons/react";
import { useAuth } from "../../auth/AuthContext";

export function AccountPage() {
  const { session } = useAuth();
  const [editing, setEditing] = useState(false);
  const [licenseImage, setLicenseImage] = useState<string | null>(() => localStorage.getItem("bonbon.license.preview"));
  const fileRef = useRef<HTMLInputElement>(null);
  const joined = useMemo(() => new Intl.DateTimeFormat("vi-VN", { month: "2-digit", year: "numeric" }).format(new Date()), []);
  const account = session?.account;

  const onLicense = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result);
      localStorage.setItem("bonbon.license.preview", value);
      setLicenseImage(value);
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      <div className="portal-title-row"><h1>Tài khoản của tôi</h1></div>
      <article className="portal-card account-card">
        <div className="card-heading">
          <div><h2>Thông tin tài khoản</h2><p>Quản lý thông tin để bảo mật tài khoản của bạn.</p></div>
          <button className="icon-text-button" type="button" onClick={() => setEditing((v) => !v)}><PencilSimple size={18} /> {editing ? "Hoàn tất" : "Chỉnh sửa"}</button>
        </div>
        <div className="account-grid">
          <div className="profile-summary">
            <div className="profile-avatar"><span>{(account?.fullName || "BB").slice(0, 2).toUpperCase()}</span><button type="button" aria-label="Đổi ảnh đại diện"><Camera size={17} /></button></div>
            <h3>{account?.displayName || account?.fullName}</h3>
            <p>Thành viên từ {joined}</p>
            <div className="trip-stat"><strong>0</strong><span>Chuyến đã hoàn thành</span></div>
          </div>
          <div className="profile-fields">
            <label><span>Họ và tên</span><input disabled={!editing} defaultValue={account?.fullName} /></label>
            <label><span>Ngày sinh</span><input disabled={!editing} type="date" /></label>
            <label><span>Giới tính</span><select disabled={!editing} defaultValue=""><option value="">Chưa cập nhật</option><option>Nam</option><option>Nữ</option><option>Khác</option></select></label>
            <label><span>Số điện thoại</span><div className="verified-field"><input disabled={!editing} placeholder="Chưa cập nhật" /><small>Chưa xác thực</small></div></label>
            <label><span>Email</span><div className="verified-field"><input disabled value={account?.email} /><small className="verified"><CheckCircle weight="fill" /> Đã xác thực</small></div></label>
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
