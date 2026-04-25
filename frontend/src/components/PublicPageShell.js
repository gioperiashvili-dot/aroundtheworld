import { useEffect, useMemo, useState } from "react";
import HomeHeroSlider from "./HomeHeroSlider";
import Navbar from "./Navbar";
import PublicFooter from "./PublicFooter";
import { getPublicBackgroundSlides } from "../lib/publicBackgrounds";

const SLIDER_INTERVAL_MS = 6200;

export default function PublicPageShell({
  backgroundImage,
  eyebrow,
  title,
  description,
  highlights = [],
  heroAside = null,
  compactHero = false,
  children,
}) {
  const slides = useMemo(
    () => getPublicBackgroundSlides(backgroundImage),
    [backgroundImage]
  );
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    setActiveSlide(0);
  }, [slides]);

  useEffect(() => {
    if (slides.length < 2) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setActiveSlide((currentIndex) => (currentIndex + 1) % slides.length);
    }, SLIDER_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [slides]);

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-slate-950 text-slate-900 transition-colors dark:text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <HomeHeroSlider
          slides={slides}
          activeIndex={activeSlide}
          onSelect={setActiveSlide}
          showControls={false}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.16)_0%,rgba(2,6,23,0.24)_28%,rgba(2,6,23,0.44)_58%,rgba(2,6,23,0.72)_100%)]" />
      </div>

      <section className="relative z-10">
        <div
          className={`mx-auto flex w-full max-w-[1500px] flex-col px-4 pt-6 sm:px-6 md:pt-8 lg:px-8 ${
            compactHero ? "min-h-[21rem] pb-14 md:min-h-[23rem] md:pb-16" : "min-h-[34rem] pb-24"
          }`}
        >
          <Navbar variant="page" />

          <div
            className={`grid flex-1 gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end ${
              compactHero ? "mt-7" : "mt-10"
            }`}
          >
            <div className="max-w-4xl space-y-5 pb-2">
              {eyebrow ? (
                <p className="inline-flex rounded-full border border-white/18 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.34em] text-white/82 backdrop-blur">
                  {eyebrow}
                </p>
              ) : null}
              {title ? (
                <h1 className="[font-family:var(--font-display)] text-4xl font-semibold leading-tight text-white md:text-6xl">
                  {title}
                </h1>
              ) : null}
              {description ? (
                <p className="max-w-3xl text-base leading-8 text-white/78 md:text-lg">
                  {description}
                </p>
              ) : null}
            </div>

            {heroAside ? (
              heroAside
            ) : highlights.length > 0 ? (
              <div className="grid gap-4">
                {highlights.map((highlight) => (
                  <article
                    key={highlight.label}
                    className="rounded-[1.8rem] border border-white/14 bg-white/10 p-5 text-white shadow-[0_22px_80px_-54px_rgba(15,23,42,0.9)] backdrop-blur dark:border-white/10 dark:bg-white/5"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/58">
                      {highlight.label}
                    </p>
                    <h2 className="mt-3 [font-family:var(--font-display)] text-2xl font-semibold text-white">
                      {highlight.value}
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-white/72">{highlight.text}</p>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <main
        className={`relative z-10 mx-auto w-full max-w-[1500px] px-4 pb-16 sm:px-6 lg:px-8 ${
          compactHero ? "-mt-8 md:-mt-10" : "-mt-16"
        }`}
      >
        {children}
      </main>

      <PublicFooter />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-[linear-gradient(180deg,rgba(2,6,23,0)_0%,rgba(2,6,23,0.34)_48%,rgba(2,6,23,0.62)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(251,146,60,0.16),transparent_28%)]" />
    </div>
  );
}
