import { advantages } from "../../data/landing-content";
import { Reveal } from "../ui/Reveal";
import { SectionHeading } from "../ui/SectionHeading";

export function AdvantagesSection() {
  return (
    <section id="uu-diem" className="section advantages-section">
      <div className="container">
        <Reveal>
          <SectionHeading title="Ưu Điểm Của BonBon" description="Những tính năng giúp bạn dễ dàng hơn khi thuê xe trên BonBon." />
        </Reveal>
        <div className="advantages-grid">
          {advantages.map((advantage, index) => (
            <Reveal key={advantage.title} delay={(index % 3) * 0.06} className="advantage-item">
              <div className="advantage-visual">
                <img src={advantage.image} alt={advantage.title} loading="lazy" />
              </div>
              <h3>{advantage.title}</h3>
              <p>{advantage.description}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
