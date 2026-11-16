import { useState, type FormEvent } from "react";
import { forgotPassword, resetPassword } from "../../auth/auth-api";

type Step = "email" | "otp" | "done";

/**
 * Quên mật khẩu bằng OTP gửi qua Gmail. Luồng:
 * 1. Nhập email → POST /auth/forgot-password (luôn báo đã gửi để chống liệt kê).
 * 2. Nhập OTP 6 số + mật khẩu mới → POST /auth/reset-password.
 */
export function ForgotPasswordForm({ email: initialEmail, onBackToLogin }: {
  email: string;
  onBackToLogin: () => void;
}) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function handleSend(event?: FormEvent) {
    event?.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) { setError("Vui lòng nhập email."); return; }
    if (!/^\S+@\S+\.\S+$/.test(trimmed)) { setError("Email chưa đúng định dạng."); return; }
    setIsSubmitting(true);
    setError("");
    setInfo("");
    try {
      await forgotPassword(trimmed);
      setStep("otp");
      setInfo("Mã OTP đã được gửi về Gmail. Mã có hiệu lực trong 10 phút.");
      setCooldown(60);
      const timer = window.setInterval(() => {
        setCooldown((value) => {
          if (value <= 1) { window.clearInterval(timer); return 0; }
          return value - 1;
        });
      }, 1000);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể gửi OTP. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReset(event: FormEvent) {
    event.preventDefault();
    if (!/^\d{6}$/.test(otp.trim())) { setError("Mã OTP gồm 6 chữ số."); return; }
    if (newPassword.length < 6) { setError("Mật khẩu mới cần có ít nhất 6 ký tự."); return; }
    if (newPassword !== confirmPassword) { setError("Mật khẩu nhập lại chưa khớp."); return; }
    setIsSubmitting(true);
    setError("");
    try {
      await resetPassword({ email: email.trim(), otp: otp.trim(), newPassword });
      setStep("done");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể đặt lại mật khẩu.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (step === "done") {
    return (
      <>
        <p className="form-message ok" role="status">Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.</p>
        <button className="auth-submit" type="button" onClick={onBackToLogin}>Về đăng nhập</button>
      </>
    );
  }

  if (step === "otp") {
    return (
      <form className="auth-form" onSubmit={handleReset} noValidate>
        <p className="form-message ok" role="status">{info || `Mã OTP đã gửi về ${email.trim()}.`}</p>
        <label className="auth-field">
          <span>Mã OTP (6 số)</span>
          <input
            className="auth-otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            maxLength={6}
            value={otp}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
            disabled={isSubmitting}
          />
        </label>
        <label className="auth-field">
          <span>Mật khẩu mới</span>
          <input
            type="password"
            autoComplete="new-password"
            placeholder="Tối thiểu 6 ký tự"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            disabled={isSubmitting}
          />
        </label>
        <label className="auth-field">
          <span>Nhập lại mật khẩu mới</span>
          <input
            type="password"
            autoComplete="new-password"
            placeholder="Nhập lại mật khẩu mới"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            disabled={isSubmitting}
          />
        </label>
        {error ? <p className="auth-error" role="alert">{error}</p> : null}
        <button className="auth-submit" type="submit" disabled={isSubmitting || otp.length !== 6 || !newPassword}>
          {isSubmitting ? "Đang xử lý…" : "Đặt lại mật khẩu"}
        </button>
        <p className="auth-switch">
          Chưa nhận được mã?{" "}
          <button type="button" onClick={() => void handleSend()} disabled={isSubmitting || cooldown > 0}>
            {cooldown > 0 ? `Gửi lại sau ${cooldown}s` : "Gửi lại mã"}
          </button>
        </p>
        <p className="auth-switch">
          <button type="button" onClick={() => { setStep("email"); setError(""); }} disabled={isSubmitting}>
            Đổi email khác
          </button>
        </p>
      </form>
    );
  }

  return (
    <form className="auth-form" onSubmit={handleSend} noValidate>
      <p className="auth-muted">Nhập email đăng ký, BonBon sẽ gửi mã OTP 6 số về Gmail để đặt lại mật khẩu.</p>
      <label className="auth-field">
        <span>Email</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          placeholder="ban@example.com"
          disabled={isSubmitting}
        />
      </label>
      {info ? <p className="form-message ok" role="status">{info}</p> : null}
      {error ? <p className="auth-error" role="alert">{error}</p> : null}
      <button className="auth-submit" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Đang gửi…" : "Gửi mã OTP"}
      </button>
    </form>
  );
}
