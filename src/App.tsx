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
import { VehicleListPage } from "./components/vehicles/VehicleListPage";
import { OwnerLandingPage } from "./components/owner/OwnerLandingPage";
import { OwnerRegisterPage } from "./components/owner/OwnerRegisterPage";
import { useAuth } from "./auth/AuthContext";
import type { ComponentType } from "react";

const portalPages: Record<string, ComponentType> = {
  "/account": AccountPage,
  "/my-favorites": FavoritesPage,
  "/my-trips": TripsPage,
  "/my-addresses": AddressesPage,
  "/change-password": ChangePasswordPage,
};

export default function App() {
  const { session, isRestoring } = useAuth();
  const path = window.location.pathname.replace(/\/$/, "") || "/";
  const PortalPage = portalPages[path];

  if (PortalPage) {
    return <div className="app-shell portal-app"><Header />{isRestoring ? <div className="portal-auth-state">Đang khôi phục phiên đăng nhập...</div> : session ? <PortalLayout path={path}><PortalPage /></PortalLayout> : <div className="portal-auth-state"><h1>Bạn cần đăng nhập</h1><p>Đăng nhập để truy cập khu vực tài khoản BonBon.</p><a className="button portal-primary" href="/">Về trang chủ</a></div>}</div>;
  }

  if (path === "/cars") {
    return <div className="app-shell vehicle-list-app"><Header /><VehicleListPage /></div>;
  }

  if (path === "/become-owner") {
    return <div className="app-shell owner-app"><Header /><OwnerLandingPage /><Footer /></div>;
  }

  if (path === "/owner/register") {
    return <div className="app-shell owner-app"><Header /><OwnerRegisterPage /></div>;
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
