import { useState, type ReactNode } from "react";
import {
  Car,
  Heart,
  LockKey,
  MapPin,
  MapTrifold,
  SignOut,
  UserCircle,
  ClipboardText,
  CarProfile,
  CalendarBlank,
} from "@phosphor-icons/react";
import { useAuth } from "../../auth/AuthContext";

const renterNav = [
  { href: "/account", label: "Tài khoản của tôi", icon: UserCircle },
  { href: "/my-favorites", label: "Xe yêu thích", icon: Heart },
  { href: "/my-trips", label: "Chuyến của tôi", icon: Car },
  { href: "/my-addresses", label: "Địa chỉ của tôi", icon: MapPin },
  { href: "/change-password", label: "Đổi mật khẩu", icon: LockKey },
];

const ownerNav = [
  { href: "/account", label: "Tài khoản của tôi", icon: UserCircle },
  { href: "/owner/bookings", label: "Đơn thuê xe", icon: ClipboardText },
  { href: "/owner/tracking", label: "Theo dõi chuyến cho thuê", icon: MapTrifold },
  { href: "/change-password", label: "Đổi mật khẩu", icon: LockKey },
];

export function PortalLayout({ path, children }: { path: string; children: ReactNode }) {
  const { session, logout } = useAuth();
  const isOwner = session?.account.roles.includes("VehicleOwner") ?? false;
  const [mode, setMode] = useState<"renter" | "owner">(() => {
    if (!isOwner) return "renter";
    const savedMode = window.localStorage.getItem("bonbon-portal-mode");
    if (savedMode === "renter" || savedMode === "owner") return savedMode;
    return path.startsWith("/owner/") ? "owner" : "renter";
  });
  const activeMode = isOwner ? mode : "renter";
  const nav = activeMode === "owner" ? ownerNav : renterNav;

  const switchMode = (nextMode: "renter" | "owner") => {
    setMode(nextMode);
    window.localStorage.setItem("bonbon-portal-mode", nextMode);
    if (nextMode === "owner" && !path.startsWith("/owner/")) window.location.href = "/owner/bookings";
    if (nextMode === "renter" && path.startsWith("/owner/")) window.location.href = "/my-trips";
  };

  return (
    <main className="portal-shell">
      <div className="portal-container">
        <aside className="portal-sidebar">
          <div className="portal-greeting">
            <span>Xin chào bạn!</span>
            <strong>{session?.account.displayName || session?.account.fullName || "Thành viên BonBon"}</strong>
          </div>
          {isOwner ? (
            <div className="portal-mode-switch" role="group" aria-label="Chuyển khu vực">
              <button type="button" className={activeMode === "renter" ? "active" : ""} aria-pressed={activeMode === "renter"} onClick={() => switchMode("renter")}>Người thuê</button>
              <button type="button" className={activeMode === "owner" ? "active" : ""} aria-pressed={activeMode === "owner"} onClick={() => switchMode("owner")}>Chủ xe</button>
            </div>
          ) : null}
          <nav aria-label={activeMode === "owner" ? "Khu vực chủ xe" : "Khu vực người thuê"}>
            {nav.map(({ href, label, icon: Icon }) => (
              <a key={href} href={href} className={path === href || (path === "/owner/gps" && href === "/owner/tracking") ? "active" : ""}>
                <Icon size={22} weight={path === href || (path === "/owner/gps" && href === "/owner/tracking") ? "fill" : "regular"} />
                {label}
              </a>
            ))}
            <button type="button" onClick={() => void logout().then(() => { window.location.href = "/"; })}>
              <SignOut size={22} /> Đăng xuất
            </button>
          </nav>
        </aside>
        <section className="portal-content">{children}</section>
      </div>
    </main>
  );
}
