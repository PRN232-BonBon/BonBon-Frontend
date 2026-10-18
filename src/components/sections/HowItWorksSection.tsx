import { rentalSteps } from "../../data/landing-content";
import { Reveal } from "../ui/Reveal";
import { SectionHeading } from "../ui/SectionHeading";

export function HowItWorksSection() {
  return (
    <section id="huong-dan" className="section how-section">
      <div className="container">
        <Reveal>
          <SectionHeading title="Hướng Dẫn Thuê Xe" description="Chỉ với 4 bước đơn giản để trải nghiệm thuê xe BonBon một cách nhanh chóng." />
        </Reveal>
        <div className="steps-grid">
          {rentalSteps.map((step, index) => (
            <Reveal key={step.title} delay={index * 0.06} className="step-item">
              <div className="step-image">
                <img src={step.image} alt={step.title} loading="lazy" />
              </div>
              <div className="step-copy">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{step.title}</h3>
                {"description" in step && typeof step.description === "string" ? <p>{step.description}</p> : null}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
