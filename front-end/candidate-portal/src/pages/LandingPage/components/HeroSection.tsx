import { LandingPageContent } from "@/lib/constants";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export function HeroSection() {
  const {t} = useTranslation();
  const LandingPageSlides = LandingPageContent(t);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % LandingPageSlides.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative h-[40vh] md:h-[70vh] overflow-hidden">
      {/* Slides */}
      {LandingPageSlides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-700 ${
            current === index ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <img
            src={slide.image}
            alt={slide.title}
            className="absolute inset-0 h-full w-full object-cover"
          />

          <div className="absolute inset-0 bg-linear-to-r from-primary/80 to-secondary/80 mix-blend-multiply" />

          <div className="relative z-10 flex h-full items-center justify-center px-4 text-center">
            <div>
              <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-white md:text-6xl">
                {slide.title}
              </h1>

              <p className="mx-auto max-w-2xl text-lg text-white/90 md:text-xl">
                {slide.description}
              </p>
            </div>
          </div>
        </div>
      ))}

      {/* Dots */}
      <div className="absolute bottom-12 left-1/2 z-20 flex -translate-x-1/2 gap-2">
        {LandingPageSlides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrent(index)}
            className={`h-2.5 rounded-full transition-all ${
              current === index ? "w-8 bg-white" : "w-2.5 bg-white/50"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
