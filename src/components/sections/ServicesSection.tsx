import { ArrowRight } from "@phosphor-icons/react";
import { Reveal } from "../ui/Reveal";
import { SectionHeading } from "../ui/SectionHeading";

export function ServicesSection() {
  return (
    <section id="dich-vu" className="section services-section">
      <div className="container">
        <Reveal><SectionHeading title="Dịch Vụ Của BonBon" /></Reveal>
        <div className="services-grid">
          <Reveal className="service-card service-card-left">
            <img src="/assets/services/self-drive-clean.png" alt="Trải nghiệm tự lái cùng BonBon" loading="lazy" />
            <div className="service-content">
              <h3>Xe đã sẵn sàng. Bắt đầu hành trình ngay!</h3>
              <p>Tự tay cầm lái chiếc xe phù hợp với kế hoạch của bạn.</p>
              <a className="button button-primary" href="#top">Thuê xe <ArrowRight size={18} /></a>
            </div>
          </Reveal>

          <Reveal className="service-card service-card-right" delay={0.08}>
            <img src="/assets/services/become-owner-clean.png" alt="Chủ xe đồng hành cùng BonBon" loading="lazy" />
            <div className="service-content service-content-right">
              <h3>Đưa chiếc xe của bạn đến gần người thuê hơn</h3>
              <p>Quản lý lịch xe, duyệt booking và theo dõi chuyến đi trên một nền tảng.</p>
              <a className="button button-primary" href="#top">Đăng xe <ArrowRight size={18} /></a>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
