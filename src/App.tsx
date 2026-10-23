import { Header } from "./components/layout/Header";
import { Footer } from "./components/layout/Footer";
import { HeroSection } from "./components/sections/HeroSection";
import { FeaturedLocations } from "./components/sections/FeaturedLocations";
import { AdvantagesSection } from "./components/sections/AdvantagesSection";
import { ServicesSection } from "./components/sections/ServicesSection";
import { HowItWorksSection } from "./components/sections/HowItWorksSection";
import { PortalLayout } from "./components/portal/PortalLayout";
import { AccountPage } from "./components/portal/AccountPage";
import { FavoritesPage } from "./components/portal/FavoritesPage";
import { TripsPage } from "./components/portal/TripsPage";
import { AddressesPage } from "./components/portal/AddressesPage";
import { ChangePasswordPage } from "./components/portal/ChangePasswordPage";
import { PaymentResultPage } from "./components/payment/PaymentResultPage";
import { useAuth } from "./auth/AuthContext";
import type { ComponentType } from "react";

const portalPages: Record<string, ComponentType> = {
  "/account": AccountPage,
  "/my-favorites": FavoritesPage,
  "/my-trips": TripsPage,
  "/my-addresses": AddressesPage,
  "/change-password": ChangePasswordPage,
  "/payment/result": PaymentResultPage,
};

export default function App() {
  const { session, isRestoring } = useAuth();
  const path = window.location.pathname.replace(/\/$/, "") || "/";
  const PortalPage = portalPages[path];

  if (PortalPage) {
    const paymentLayout = path === "/my-trips" || path === "/payment/result";
    return <div className={`app-shell portal-app${paymentLayout ? " payment-portal" : ""}`}><Header />{isRestoring ? <div className="portal-auth-state">Đang khôi phục phiên đăng nhập...</div> : session ? <PortalLayout path={path === "/payment/result" ? "/my-trips" : path}><PortalPage /></PortalLayout> : <div className="portal-auth-state"><h1>Bạn cần đăng nhập</h1><p>Đăng nhập để truy cập khu vực tài khoản BonBon.</p><a className="button portal-primary" href="/">Về trang chủ</a></div>}</div>;
  }

  return (
    <div className="app-shell">
      <Header />
      <HeroSection />
      <FeaturedLocations />
      <AdvantagesSection />
      <ServicesSection />
      <HowItWorksSection />
      <Footer />
    </div>
  );
}
