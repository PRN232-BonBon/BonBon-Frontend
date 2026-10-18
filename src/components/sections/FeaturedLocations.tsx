import { useRef } from "react";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import { locations } from "../../data/landing-content";
import { Reveal } from "../ui/Reveal";
import { SectionHeading } from "../ui/SectionHeading";

export function FeaturedLocations() {
  const trackRef = useRef<HTMLDivElement>(null);

  function scroll(direction: number) {
    trackRef.current?.scrollBy({ left: direction * 320, behavior: "smooth" });
  }

  return (
    <section id="dia-diem" className="section locations-section">
      <div className="container">
        <Reveal>
          <div className="section-topline locations-heading-row">
            <SectionHeading title="Địa Điểm Nổi Bật" />
          </div>
        </Reveal>

        <div className="location-carousel">
          <button className="location-arrow location-arrow-left" type="button" aria-label="Xem địa điểm trước" onClick={() => scroll(-1)}><ArrowLeft size={21} /></button>
          <div className="location-track" ref={trackRef}>
            {locations.map((location, index) => (
              <Reveal key={location.name} delay={index * 0.05} className="location-card-wrap">
                <a className="location-card" href="#top" aria-label={`Tìm xe tại ${location.name}`}>
                  <img src={location.image} alt={location.name} loading="lazy" />
                  <div className="location-scrim" />
                  <div className="location-copy">
                    <h3>{location.name}</h3>
                    <span>{location.count}</span>
                  </div>
                </a>
              </Reveal>
            ))}
          </div>
          <button className="location-arrow location-arrow-right" type="button" aria-label="Xem địa điểm tiếp theo" onClick={() => scroll(1)}><ArrowRight size={21} /></button>
        </div>
      </div>
    </section>
  );
}
