import { useEffect, useMemo, useRef, useState } from "react";
import { CaretDown, List, SignOut, X } from "@phosphor-icons/react";
import { useAuth } from "../../auth/AuthContext";
import { AuthModal, type AuthMode } from "../auth/AuthModal";

const links = [
  { label: "Về BonBon", href: "/#uu-diem" },
  { label: "Trở thành chủ xe", href: "/#dich-vu" },
];

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const { session, isRestoring, logout } = useAuth();

  const openAuth = (mode: AuthMode) => {
    setIsOpen(false);
    setAuthMode(mode);
  };

  const accountName = session?.account.displayName || session?.account.fullName;
  const accountInitials = useMemo(() => {
    const source = accountName?.trim() || session?.account.email || "BB";
    const parts = source.split(/\s+/).filter(Boolean);
    return (parts.length > 1 ? `${parts[0][0]}${parts.at(-1)?.[0]}` : source.slice(0, 2)).toUpperCase();
  }, [accountName, session?.account.email]);

  useEffect(() => {
    if (!isAccountOpen) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) setIsAccountOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsAccountOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isAccountOpen]);

  return (
    <header className="site-header">
      <div className="container header-inner">
        <a className="brand" href="/#top" aria-label="BonBon - về đầu trang">
          <img src="/assets/brand/bonbon-logo-cropped.png" alt="BonBon" />
        </a>

        <nav className="desktop-nav" aria-label="Điều hướng chính">
          {links.map((link) => (
            <a key={link.href} href={link.href}>{link.label}</a>
          ))}
          {session ? <a className="member-trip-link" href="/my-trips">Chuyến của tôi</a> : null}
        </nav>

        <div className="header-actions">
          {session ? (
            <div className="account-menu" ref={accountMenuRef}>
              <button
                className="account-trigger"
                type="button"
                aria-haspopup="menu"
                aria-expanded={isAccountOpen}
                onClick={() => setIsAccountOpen((value) => !value)}
              >
                <span className="account-avatar" aria-hidden="true">{accountInitials}</span>
                <span className="account-trigger-name">{accountName}</span>
                <CaretDown className={isAccountOpen ? "is-open" : ""} size={16} weight="bold" />
              </button>

              {isAccountOpen ? (
                <div className="account-dropdown" role="menu">
                  <div className="account-dropdown-profile">
                    <span className="account-avatar account-avatar-large" aria-hidden="true">{accountInitials}</span>
                    <div>
                      <strong>{accountName}</strong>
                      <span>{session.account.email}</span>
                    </div>
                  </div>
                  <a href="/account" role="menuitem" onClick={() => setIsAccountOpen(false)}>Tài khoản của tôi</a>
                  <a href="/my-favorites" role="menuitem" onClick={() => setIsAccountOpen(false)}>Xe yêu thích</a>
                  <a href="/my-trips" role="menuitem" onClick={() => setIsAccountOpen(false)}>Chuyến của tôi</a>
                  <a href="/my-addresses" role="menuitem" onClick={() => setIsAccountOpen(false)}>Địa chỉ của tôi</a>
                  <button
                    className="account-logout"
                    type="button"
                    role="menuitem"
                    onClick={() => { setIsAccountOpen(false); void logout(); }}
                  >
                    <SignOut size={19} /> Đăng xuất
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <button className="signup-link" type="button" onClick={() => openAuth("register")} disabled={isRestoring}>Đăng ký</button>
              <button className="button button-outline" type="button" onClick={() => openAuth("login")} disabled={isRestoring}>Đăng nhập</button>
            </>
          )}
        </div>

        <button
          className="menu-button"
          type="button"
          aria-label={isOpen ? "Đóng menu" : "Mở menu"}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((value) => !value)}
        >
          {isOpen ? <X size={24} /> : <List size={26} />}
        </button>
      </div>

      {isOpen ? (
        <nav className="mobile-nav" aria-label="Điều hướng di động">
          {links.map((link) => (
            <a key={link.href} href={link.href} onClick={() => setIsOpen(false)}>{link.label}</a>
          ))}
          {session ? (
            <>
              <div className="mobile-account-summary">
                <span className="account-avatar" aria-hidden="true">{accountInitials}</span>
                <div><strong>{accountName}</strong><span>{session.account.email}</span></div>
              </div>
              <a href="/my-trips" onClick={() => setIsOpen(false)}>Chuyến của tôi</a>
              <a href="/account" onClick={() => setIsOpen(false)}>Tài khoản của tôi</a>
              <button className="mobile-auth-action" type="button" onClick={() => { setIsOpen(false); void logout(); }}>
                <SignOut size={20} /> Đăng xuất
              </button>
            </>
          ) : (
            <>
              <button className="mobile-auth-action" type="button" onClick={() => openAuth("register")}>Đăng ký</button>
              <button className="mobile-auth-action" type="button" onClick={() => openAuth("login")}>Đăng nhập</button>
            </>
          )}
        </nav>
      ) : null}

      {authMode ? (
        <AuthModal mode={authMode} onModeChange={setAuthMode} onClose={() => setAuthMode(null)} />
      ) : null}
    </header>
  );
}
