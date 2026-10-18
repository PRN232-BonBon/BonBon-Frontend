import { useState } from "react";
import { CheckCircle, Eye, EyeSlash, LockKey } from "@phosphor-icons/react";
import { useAuth } from "../../auth/AuthContext";
import { changePassword } from "../../portal/portal-api";

export function ChangePasswordPage() {
  const { session } = useAuth();
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setMessage(null);
    if (form.next.length < 8) return setMessage({ type: "error", text: "Mật khẩu mới cần ít nhất 8 ký tự." });
    if (form.next !== form.confirm) return setMessage({ type: "error", text: "Xác nhận mật khẩu chưa khớp." });
    if (!session) return setMessage({ type: "error", text: "Phiên đăng nhập đã hết hạn." });
    try { setSaving(true); await changePassword(session, form.current, form.next); setForm({ current: "", next: "", confirm: "" }); setMessage({ type: "ok", text: "Đổi mật khẩu thành công." }); }
    catch (error) { setMessage({ type: "error", text: error instanceof Error ? error.message : "Không thể đổi mật khẩu." }); }
    finally { setSaving(false); }
  };
  const field = (key: "current" | "next" | "confirm", label: string) => <label><span>{label}</span><div className="password-input"><input required minLength={key === "current" ? 1 : 8} type={visible[key] ? "text" : "password"} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /><button type="button" aria-label={visible[key] ? "Ẩn mật khẩu" : "Hiện mật khẩu"} onClick={() => setVisible({ ...visible, [key]: !visible[key] })}>{visible[key] ? <EyeSlash /> : <Eye />}</button></div></label>;
  return <><div className="portal-title-row"><div><h1>Đổi mật khẩu</h1><p>Vui lòng nhập mật khẩu hiện tại của bạn để thay đổi mật khẩu.</p></div></div><article className="portal-card password-card"><div className="password-card-icon"><LockKey size={30} /></div><div><h2>Nhập mật khẩu</h2><p>Mật khẩu nên có tối thiểu 8 ký tự và không trùng mật khẩu cũ.</p></div><form onSubmit={submit}>{field("current", "Mật khẩu hiện tại")}{field("next", "Mật khẩu mới")}{field("confirm", "Xác nhận mật khẩu mới")}{message ? <div className={`form-message ${message.type}`}>{message.type === "ok" ? <CheckCircle weight="fill" /> : null}{message.text}</div> : null}<button className="button portal-primary" disabled={saving} type="submit">{saving ? "Đang lưu..." : "Xác nhận"}</button></form></article></>;
}
