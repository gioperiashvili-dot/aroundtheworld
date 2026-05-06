import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import FlightSearchPanel from "../components/FlightSearchPanel";
import HomeHeroSlider from "../components/HomeHeroSlider";
import Navbar from "../components/Navbar";
import PublicFooter from "../components/PublicFooter";
import ReviewsSection from "../components/ReviewsSection";
import SEO, { PAGE_SEO, TRAVEL_AGENCY_JSON_LD } from "../components/SEO";
import { useLanguage } from "../i18n/LanguageContext";
import { PUBLIC_BACKGROUND_SLIDES } from "../lib/publicBackgrounds";

const SLIDER_INTERVAL_MS = 5600;

const HERO_SLIDES = PUBLIC_BACKGROUND_SLIDES;

export default function HomePage({ seoPage = "home" }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [activeSlide, setActiveSlide] = useState(0);
  const homeEyebrow = t("home.eyebrow");
  const homeTitle = t("home.title");
  const homeDescription = t("home.description");
  const seoMetadata = PAGE_SEO[seoPage] || PAGE_SEO.home;

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveSlide((currentIndex) => (currentIndex + 1) % HERO_SLIDES.length);
    }, SLIDER_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const handleFlightSearch = (_snapshot, nextParams) => {
    navigate(`/flights?${nextParams.toString()}`);
  };

  const pageCards = [
    { key: "tours", path: "/tours" },
    { key: "flights", path: "/flights" },
    { key: "hotels", path: "/hotels" },
    { key: "restaurants", path: "/restaurants" },
  ];

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-slate-950 text-slate-900 transition-colors dark:text-slate-100">
      <SEO
        {...seoMetadata}
        jsonLd={seoPage === "home" ? TRAVEL_AGENCY_JSON_LD : undefined}
      />
        <HomeHeroSlider
          slides={HERO_SLIDES}
          activeIndex={activeSlide}
          onSelect={setActiveSlide}
          showControls={false}
        />

      <section className="relative z-10">
        <div className="mx-auto flex min-h-[100svh] w-full max-w-[1500px] flex-col px-4 pb-20 pt-6 sm:px-6 lg:px-8">
          <Navbar variant="home" />

          <div className="flex flex-1 flex-col items-center justify-center pb-14 pt-16 text-center md:pt-24">
            <div className="max-w-4xl space-y-5">
              {homeEyebrow ? (
                <p className="inline-flex rounded-full border border-white/18 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.34em] text-white/90 backdrop-blur">
                  {homeEyebrow}
                </p>
              ) : null}

              {homeTitle ? (
                <h1 className="[font-family:var(--font-display)] text-4xl font-semibold leading-tight text-white md:text-6xl lg:text-7xl">
                  {homeTitle}
                </h1>
              ) : null}

              {homeDescription ? (
                <p className="mx-auto max-w-2xl text-base leading-8 text-white/88 md:text-lg">
                  {homeDescription}
                </p>
              ) : null}
            </div>

            <div className="mt-10 w-full max-w-[1360px]">
              <FlightSearchPanel onSearch={handleFlightSearch} />

              <div className="mt-8 flex items-center justify-center gap-3">
                {HERO_SLIDES.map((slide, index) => (
                  <button
                    key={slide.image}
                    type="button"
                    onClick={() => setActiveSlide(index)}
                    className={`h-2.5 rounded-full transition-all ${
                      index === activeSlide
                        ? "w-10 bg-white"
                        : "w-2.5 bg-white/45 hover:bg-white/75"
                    }`}
                    aria-label={slide.label}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="relative z-10 mx-auto -mt-16 w-full max-w-[1500px] px-4 pb-16 sm:px-6 lg:px-8">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {pageCards.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => navigate(item.path)}
              className="homepage-feature-card group rounded-[1.9rem] p-5 text-left backdrop-blur-md transition"
            >
              <p className="homepage-feature-card__label text-xs font-semibold uppercase tracking-[0.26em] transition-colors">
                {t(`home.cards.${item.key}.category`)}
              </p>
              <h2 className="homepage-feature-card__title [font-family:var(--font-display)] mt-3 text-2xl font-semibold transition-colors">
                {t(`home.cards.${item.key}.title`)}
              </h2>
              <p className="homepage-feature-card__description mt-3 text-sm leading-8 transition-colors">
                {t(`home.cards.${item.key}.text`)}
              </p>
            </button>
          ))}
        </section>

        <div className="mt-8">
          <ReviewsSection relatedType="site" />
        </div>
      </main>

      <PublicFooter />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(180deg,rgba(2,6,23,0)_0%,rgba(2,6,23,0.44)_100%)]" />
    </div>
  );
}
