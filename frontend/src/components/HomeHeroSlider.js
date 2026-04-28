import { useEffect, useMemo, useState } from "react";

const DEFER_SLIDER_IMAGES_MS = 3200;

export default function HomeHeroSlider({
  slides,
  activeIndex,
  onSelect,
  showControls = true,
}) {
  const [shouldRenderDeferredSlides, setShouldRenderDeferredSlides] = useState(false);
  const visibleIndex = Math.min(Math.max(activeIndex, 0), Math.max(slides.length - 1, 0));

  useEffect(() => {
    setShouldRenderDeferredSlides(false);

    const timeoutId = window.setTimeout(() => {
      setShouldRenderDeferredSlides(true);
    }, DEFER_SLIDER_IMAGES_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [slides]);

  const renderedSlides = useMemo(() => {
    if (shouldRenderDeferredSlides) {
      return slides.map((slide, index) => ({ slide, index }));
    }

    const visibleSlide = slides[visibleIndex];

    return visibleSlide ? [{ slide: visibleSlide, index: visibleIndex }] : [];
  }, [shouldRenderDeferredSlides, slides, visibleIndex]);

  return (
    <>
      <div className="absolute inset-0">
        {renderedSlides.map(({ slide, index }) => {
          const isVisible = index === visibleIndex;

          return (
            <img
              key={slide.image}
              src={slide.image}
              alt=""
              width={slide.width || 1920}
              height={slide.height || 1280}
              loading={isVisible ? "eager" : "lazy"}
              decoding="async"
              fetchPriority={isVisible ? "high" : "auto"}
              className={`home-hero-slide absolute inset-0 h-full w-full object-cover transition-opacity duration-[1400ms] ease-out ${
                isVisible ? "opacity-100" : "opacity-0"
              }`}
              aria-hidden="true"
            />
          );
        })}
      </div>

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.68)_0%,rgba(2,6,23,0.38)_34%,rgba(15,23,42,0.55)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.14),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(251,146,60,0.24),_transparent_34%)]" />

      {showControls ? (
        <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3">
          {slides.map((slide, index) => (
            <button
              key={slide.image}
              type="button"
              onClick={() => onSelect(index)}
              className={`h-2.5 rounded-full transition-all ${
                index === activeIndex
                  ? "w-10 bg-white"
                  : "w-2.5 bg-white/45 hover:bg-white/75"
              }`}
              aria-label={slide.label}
            />
          ))}
        </div>
      ) : null}
    </>
  );
}
