import { lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import BookingSearchTabs from "../components/BookingSearchTabs";
import Navbar from "../components/Navbar";
import PartnersStrip from "../components/PartnersStrip";
import PublicFooter from "../components/PublicFooter";
import SEO, { PAGE_SEO } from "../components/SEO";
import { useLanguage } from "../i18n/LanguageContext";
import aroundWorldBg from "../assets/background/aroundworld-bg.webp";
import toursCardImage from "../assets/background/background-5-card.webp";
import hotelsCardImage from "../assets/background/background-6-card.webp";
import flightsCardImage from "../assets/background/visa-services-card.webp";
import reviewsImage from "../assets/background/reviews-bg.jpg";
import { SHOW_PUBLIC_REVIEWS } from "../lib/features";
import {
  buildOrganizationStructuredData,
  buildWebsiteStructuredData,
} from "../lib/structuredData";

const ReviewsSection = lazy(() => import("../components/ReviewsSection"));

export default function HomePage({ seoPage = "home" }) {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const isEnglish = language === "en";
  const homeTitle = t("home.title");
  const homeDescription = t("home.description");
  const seoMetadata = PAGE_SEO[seoPage] || PAGE_SEO.home;
  const structuredData =
    seoPage === "home"
      ? [buildOrganizationStructuredData(), buildWebsiteStructuredData()]
      : undefined;

  const serviceCards = [
    {
      key: "flights",
      path: "/flights",
      image: flightsCardImage,
      title: isEnglish ? "Flights" : "ავიაბილეთები",
      label: isEnglish ? "Air tickets" : "მოგზაურობის სერვისი",
      text: isEnglish
        ? "Find a convenient route and continue to flight search."
        : "იპოვეთ მოსახერხებელი მარშრუტი და გადადით ავიაბილეთების ძიებაზე.",
    },
    {
      key: "tours",
      path: "/tours",
      image: toursCardImage,
      title: isEnglish ? "Tours" : "ტურები",
      label: isEnglish ? "Curated travel" : "შერჩეული მოგზაურობა",
      text: isEnglish
        ? "Browse ready-made tours with clear dates, prices, and destinations."
        : "დაათვალიერეთ მზა ტურები მკაფიო თარიღებით, ფასებით და მიმართულებებით.",
    },
    {
      key: "hotels",
      path: "/hotels",
      image: hotelsCardImage,
      title: isEnglish ? "Hotels" : "სასტუმროები",
      label: isEnglish ? "Premium stays" : "სასტუმროები",
      text: isEnglish
        ? "Search stays by destination and keep planning in one premium flow."
        : "მოძებნეთ სასტუმროები მიმართულების მიხედვით და დაგეგმეთ მოგზაურობა ერთ სივრცეში.",
    },
  ];

  return (
    <div className="aw-page-background relative isolate min-h-screen overflow-x-hidden text-white transition-colors">
      <SEO {...seoMetadata} structuredData={structuredData} />

      <section className="relative z-10 px-3 py-4 sm:px-5 sm:py-7 lg:py-10">
        <div className="home-hero-shell aw-glass-panel mx-auto w-full max-w-[1500px] rounded-[2rem] px-4 pb-8 pt-4 sm:px-6 sm:pb-10 sm:pt-5 lg:px-8">
          <Navbar variant="home" />

          <div className="home-hero aw-cinematic-frame aw-hero-gradient relative mt-6 overflow-hidden rounded-[1.75rem] bg-[#031015] sm:mt-7 lg:rounded-[2rem]">
            <span className="aw-glint-line" aria-hidden="true" />
            <div className="relative min-h-[30rem] sm:min-h-[33rem] lg:min-h-[36rem] xl:min-h-[38rem]">
              <img
                src={aroundWorldBg}
                alt=""
                width="1536"
                height="1024"
                loading="eager"
                decoding="async"
                fetchPriority="high"
                className="aw-hero-media absolute inset-0 h-full w-full object-cover"
                aria-hidden="true"
              />
              <div className="absolute inset-0 bg-[#031015]/60 sm:bg-[#031015]/42" />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,16,21,0.9)_0%,rgba(7,25,31,0.58)_44%,rgba(7,25,31,0.14)_100%)] sm:bg-[linear-gradient(90deg,rgba(3,16,21,0.78)_0%,rgba(7,25,31,0.42)_46%,rgba(7,25,31,0.08)_100%)]" />
              <div className="absolute inset-x-0 bottom-0 h-4/5 bg-[linear-gradient(180deg,rgba(3,16,21,0)_0%,rgba(3,16,21,0.92)_100%)]" />
              <div className="home-hero-vignette absolute inset-0" />
              <div className="aw-orb pointer-events-none absolute -left-28 top-10 h-72 w-72 rounded-full bg-[rgba(246,196,69,0.2)] blur-3xl" />
              <div className="aw-orb pointer-events-none absolute -right-32 bottom-24 h-80 w-80 rounded-full bg-[rgba(48,190,180,0.14)] blur-3xl [animation-delay:1.5s]" />
              <div className="pointer-events-none absolute left-1/2 top-1/4 h-36 w-[42rem] -translate-x-1/2 rotate-[-12deg] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.07),transparent)] blur-2xl" />

              <div className="home-hero-content aw-animate-in relative z-10 flex min-h-[30rem] flex-col items-center justify-center px-5 py-12 text-center sm:min-h-[33rem] sm:py-14 lg:min-h-[36rem] xl:min-h-[38rem]">
                <p className="mb-4 rounded-full border border-white/16 bg-white/8 px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-[var(--aw-accent)] shadow-[0_18px_46px_-34px_rgba(0,0,0,0.95)] backdrop-blur [text-shadow:0_4px_24px_rgba(0,0,0,0.7)] sm:text-xs">
                  Around The World
                </p>
                {homeTitle ? (
                  <h1 className="home-hero-title [font-family:var(--font-display)] max-w-[62rem] text-4xl font-bold leading-[1.1] text-white [text-shadow:0_8px_34px_rgba(0,0,0,0.78),0_1px_2px_rgba(0,0,0,0.9)] sm:text-5xl lg:text-[3.45rem] xl:text-6xl">
                    {homeTitle}
                  </h1>
                ) : null}

                {homeDescription ? (
                  <p className="home-hero-subtitle mx-auto mt-5 max-w-2xl text-sm font-medium leading-7 text-white/86 [text-shadow:0_4px_24px_rgba(0,0,0,0.78),0_1px_2px_rgba(0,0,0,0.9)] sm:text-base md:text-lg md:leading-8">
                    {homeDescription}
                  </p>
                ) : null}

                <div className="mt-7 flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => navigate("/tours")}
                    className="aw-premium-button inline-flex min-h-[3.1rem] items-center justify-center rounded-full px-6 py-3.5 text-sm font-black uppercase text-slate-950 transition hover:-translate-y-0.5 sm:px-7"
                  >
                    <span className="relative z-10">{t("nav.tours")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/contact")}
                    className="inline-flex min-h-[3.1rem] items-center justify-center rounded-full border border-white/16 bg-white/8 px-6 py-3.5 text-sm font-semibold text-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur transition hover:-translate-y-0.5 hover:border-[rgba(246,196,69,0.38)] hover:bg-white/12 hover:text-white sm:px-7"
                  >
                    {t("nav.contact")}
                  </button>
                </div>

                <div className="mt-7 hidden grid-cols-3 gap-3 text-center md:grid">
                  {serviceCards.map((item) => (
                    <div key={item.key} className="aw-hero-stat rounded-[1.1rem] px-4 py-3">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--aw-accent)]">
                        {item.title}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <BookingSearchTabs className="home-search-module relative z-20 mx-auto mt-5 w-full max-w-[1360px] lg:-mt-16 xl:-mt-[4.5rem]" />
          <PartnersStrip className="mt-7 lg:mt-8" />
        </div>
      </section>

      <main className="relative z-10 mx-auto w-full max-w-[1500px] px-4 pb-16 pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:pt-8">
        <section className="grid gap-5 md:grid-cols-3">
          {serviceCards.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => navigate(item.path)}
              className="homepage-feature-card group relative flex min-h-[18rem] items-center justify-center overflow-hidden rounded-[1.35rem] p-5 text-center backdrop-blur-md transition duration-300 ease-out sm:p-6 lg:min-h-[20rem]"
            >
              <img
                src={item.image}
                alt=""
                width="720"
                height="480"
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover opacity-76 transition duration-700 group-hover:scale-[1.045] group-hover:opacity-90"
                aria-hidden="true"
              />
              <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.24)_0%,rgba(3,16,21,0.54)_48%,rgba(3,16,21,0.86)_100%)] transition group-hover:bg-[linear-gradient(180deg,rgba(0,0,0,0.16)_0%,rgba(3,16,21,0.46)_48%,rgba(3,16,21,0.82)_100%)]" />
              <span className="relative z-10 flex h-full w-full flex-col items-center justify-center text-center">
                <p className="homepage-feature-card__label text-xs font-semibold uppercase tracking-[0.26em] transition-colors">
                  {item.label}
                </p>
                <h2 className="homepage-feature-card__title [font-family:var(--font-display)] mt-3 block w-full text-center text-3xl font-bold leading-tight transition-colors">
                  {item.title}
                </h2>
                <p className="homepage-feature-card__description mt-3 text-sm leading-8 transition-colors">
                  {item.text}
                </p>
              </span>
            </button>
          ))}
        </section>

        {SHOW_PUBLIC_REVIEWS ? (
          <div className="mt-10 lg:mt-12">
            <Suspense fallback={null}>
              <ReviewsSection relatedType="site" backgroundImage={reviewsImage} />
            </Suspense>
          </div>
        ) : null}
      </main>

      <PublicFooter />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(180deg,rgba(3,16,21,0)_0%,rgba(3,16,21,0.7)_100%)]" />
    </div>
  );
}
