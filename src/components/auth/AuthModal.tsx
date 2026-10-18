import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Eye, EyeSlash, X } from "@phosphor-icons/react";
import { useAuth } from "../../auth/AuthContext";

export type AuthMode = "login" | "register";

interface AuthModalProps {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onClose: () => void;
}

const GOOGLE_SCRIPT_ID = "google-identity-services";

export function AuthModal({ mode, onModeChange, onClose }: AuthModalProps) {
  const { login, register, loginWithGoogle } = useAuth();
  const titleId = useId();
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    email: "",
    fullName: "",
    displayName: "",
    phone: "",
    password: "",
    confirmPassword: "",
    acceptedTerms: false,
  });

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    firstFieldRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    setError("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    requestAnimationFrame(() => firstFieldRef.current?.focus());
  }, [mode]);

  useEffect(() => {
    if (!googleClientId) return;

    const renderGoogleButton = () => {
      if (!window.google || !googleButtonRef.current) return;
      googleButtonRef.current.replaceChildren();
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: ({ credential }) => {
          setIsSubmitting(true);
          setError("");
          loginWithGoogle(credential)
            .then(onClose)
            .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Đăng nhập Google thất bại."))
            .finally(() => setIsSubmitting(false));
        },
      });
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        width: Math.min(380, googleButtonRef.current.clientWidth),
        locale: "vi",
      });
    };

    if (window.google) {
      renderGoogleButton();
      return;
    }

    let script = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = GOOGLE_SCRIPT_ID;
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", renderGoogleButton);
    return () => script?.removeEventListener("load", renderGoogleButton);
  }, [googleClientId, loginWithGoogle, onClose]);

  function updateField(field: keyof typeof form, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function validate() {
    if (!form.email.trim()) return "Vui lòng nhập email.";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return "Email chưa đúng định dạng.";
    if (form.password.length < 6) return "Mật khẩu cần có ít nhất 6 ký tự.";

    if (mode === "register") {
      if (form.fullName.trim().length < 2) return "Vui lòng nhập họ và tên.";
      if (form.password !== form.confirmPassword) return "Mật khẩu nhập lại chưa khớp.";
      if (!form.acceptedTerms) return "Bạn cần đồng ý với chính sách và điều khoản của BonBon.";
    }

    return "";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      if (mode === "login") {
        await login({ email: form.email.trim(), password: form.password });
      } else {
        await register({
          email: form.email.trim(),
          password: form.password,
          fullName: form.fullName.trim(),
          displayName: form.displayName.trim(),
          phone: form.phone.trim(),
        });
      }
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể hoàn tất yêu cầu.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const modal = (
    <div className="auth-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <button className="auth-close" type="button" aria-label="Đóng" onClick={onClose}>
          <X size={20} weight="bold" />
        </button>

        <div className="auth-heading">
          <h2 id={titleId}>{mode === "login" ? "Đăng nhập" : "Đăng ký"}</h2>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label className="auth-field">
            <span>Email</span>
            <input
              ref={firstFieldRef}
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              autoComplete="email"
              placeholder="ban@example.com"
              disabled={isSubmitting}
            />
          </label>

          {mode === "register" ? (
            <>
              <div className="auth-field-row">
                <label className="auth-field">
                  <span>Họ và tên</span>
                  <input
                    value={form.fullName}
                    onChange={(event) => updateField("fullName", event.target.value)}
                    autoComplete="name"
                    placeholder="Nguyễn Văn An"
                    disabled={isSubmitting}
                  />
                </label>
                <label className="auth-field">
                  <span>Tên hiển thị <small>(không bắt buộc)</small></span>
                  <input
                    value={form.displayName}
                    onChange={(event) => updateField("displayName", event.target.value)}
                    autoComplete="nickname"
                    placeholder="An Nguyễn"
                    disabled={isSubmitting}
                  />
                </label>
              </div>

              <label className="auth-field">
                <span>Số điện thoại <small>(không bắt buộc)</small></span>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(event) => updateField("phone", event.target.value)}
                  autoComplete="tel"
                  placeholder="09xx xxx xxx"
                  disabled={isSubmitting}
                />
              </label>
            </>
          ) : null}

          <label className="auth-field">
            <span>Mật khẩu</span>
            <span className="auth-password-field">
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(event) => updateField("password", event.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                placeholder="Tối thiểu 6 ký tự"
                disabled={isSubmitting}
              />
              <button type="button" aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} onClick={() => setShowPassword((value) => !value)}>
                {showPassword ? <EyeSlash size={22} /> : <Eye size={22} />}
              </button>
            </span>
          </label>

          {mode === "register" ? (
            <label className="auth-field">
              <span>Nhập lại mật khẩu</span>
              <span className="auth-password-field">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={(event) => updateField("confirmPassword", event.target.value)}
                  autoComplete="new-password"
                  placeholder="Nhập lại mật khẩu"
                  disabled={isSubmitting}
                />
                <button type="button" aria-label={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} onClick={() => setShowConfirmPassword((value) => !value)}>
                  {showConfirmPassword ? <EyeSlash size={22} /> : <Eye size={22} />}
                </button>
              </span>
            </label>
          ) : null}

          {mode === "register" ? (
            <label className="auth-consent">
              <input
                type="checkbox"
                checked={form.acceptedTerms}
                onChange={(event) => updateField("acceptedTerms", event.target.checked)}
                disabled={isSubmitting}
              />
              <span>Tôi đã đọc và đồng ý với <a href="#top">Chính sách &amp; quy định</a> và <a href="#top">Chính sách bảo mật</a> của BonBon.</span>
            </label>
          ) : null}

          {error ? <p className="auth-error" role="alert">{error}</p> : null}

          <button className="auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Đang xử lý…" : mode === "login" ? "Đăng nhập" : "Đăng ký"}
          </button>
        </form>

        <p className="auth-switch">
          {mode === "login" ? "Bạn chưa có tài khoản?" : "Bạn đã có tài khoản?"}{" "}
          <button type="button" onClick={() => onModeChange(mode === "login" ? "register" : "login")} disabled={isSubmitting}>
            {mode === "login" ? "Đăng ký ngay" : "Đăng nhập"}
          </button>
        </p>

        {googleClientId ? (
          <>
            <div className="auth-divider"><span>hoặc tiếp tục với</span></div>
            <div className="auth-google" ref={googleButtonRef} aria-label="Đăng nhập bằng Google" />
          </>
        ) : null}
      </section>
    </div>
  );

  return createPortal(modal, document.body);
}
