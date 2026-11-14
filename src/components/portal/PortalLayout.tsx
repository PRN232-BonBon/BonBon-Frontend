import type { ReactNode } from "react";
import { Car, Heart, LockKey, MapPin, SignOut, UserCircle, ClipboardText } from "@phosphor-icons/react";
import { useAuth } from "../../auth/AuthContext";

const nav = [
  { href: "/account", label: "Tài khoản của tôi", icon: UserCircle },
  { href: "/my-favorites", label: "Xe yêu thích", icon: Heart },
  { href: "/my-trips", label: "Chuyến của tôi", icon: Car },
  { href: "/my-addresses", label: "Địa chỉ của tôi", icon: MapPin },
  { href: "/change-password", label: "Đổi mật khẩu", icon: LockKey },
];

export function PortalLayout({ path, children }: { path: string; children: ReactNode }) {
  const { session, logout } = useAuth();
  return (
    <main className="portal-shell">
      <div className="portal-container">
        <aside className="portal-sidebar">
          <div className="portal-greeting">
            <span>Xin chào bạn!</span>
            <strong>{session?.account.displayName || session?.account.fullName || "Thành viên BonBon"}</strong>
          </div>
          <nav aria-label="Tài khoản">
            {nav.map(({ href, label, icon: Icon }) => (
              <a key={href} href={href} className={path === href ? "active" : ""}>
                <Icon size={22} weight={path === href ? "fill" : "regular"} />
                {label}
              </a>
            ))}
            {session?.account.roles.includes("VehicleOwner") ? <a href="/owner/bookings" className={path === "/owner/bookings" ? "active" : ""}>
              <ClipboardText size={22} weight={path === "/owner/bookings" ? "fill" : "regular"} />
              Yêu cầu thuê xe
            </a> : null}
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
