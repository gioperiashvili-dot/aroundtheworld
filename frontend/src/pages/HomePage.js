import { useNavigate } from "react-router-dom";
import BookingSearchTabs from "../components/BookingSearchTabs";
import Navbar from "../components/Navbar";
import PartnersStrip from "../components/PartnersStrip";
import PublicFooter from "../components/PublicFooter";
import ReviewsSection from "../components/ReviewsSection";
import SEO, { PAGE_SEO } from "../components/SEO";
import { useLanguage } from "../i18n/LanguageContext";
import toursCardImage from "../assets/background/background-1.webp";
import tipsCardImage from "../assets/background/background-5.webp";
import planCardImage from "../assets/background/background-6.webp";
import heroImage from "../assets/background/background-7.webp";
import visaCardImage from "../assets/background/visa-services.webp";
import {
  buildOrganizationStructuredData,
  buildWebsiteStructuredData,
} from "../lib/structuredData";

export default function HomePage({ seoPage = "home" }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const homeTitle = t("home.title");
  const homeDescription = t("home.description");
  const seoMetadata = PAGE_SEO[seoPage] || PAGE_SEO.home;
  const structuredData =
    seoPage === "home"
      ? [buildOrganizationStructuredData(), buildWebsiteStructuredData()]
      : undefined;

  const pageCards = [
    { key: "tours", path: "/tours", image: toursCardImage },
    { key: "visaServices", path: "/visa-services", image: visaCardImage },
    { key: "blog", path: "/blog", image: tipsCardImage },
    { key: "contact", path: "/contact", image: planCardImage },
  ];

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[#111111] text-white transition-colors">
      <SEO {...seoMetadata} structuredData={structuredData} />

      <section className="relative z-10 px-3 py-4 sm:px-5 sm:py-7 lg:py-10">
        <div className="mx-auto w-full max-w-[1500px] bg-[#171717] px-4 pb-8 pt-4 shadow-[0_34px_110px_-48px_rgba(0,0,0,0.95)] sm:px-6 sm:pb-10 sm:pt-5 lg:px-8">
          <Navbar variant="home" />

          <div className="relative mt-7 overflow-hidden bg-black shadow-[0_26px_90px_-54px_rgba(0,0,0,0.95)]">
            <div className="relative h-[22rem] sm:h-[28rem] lg:h-[31rem] xl:h-[34rem]">
              <img
                src={heroImage}
                alt=""
                width="1920"
                height="1275"
                loading="eager"
                decoding="async"
                fetchPriority="high"
                className="absolute inset-0 h-full w-full object-cover"
                aria-hidden="true"
              />
              <div className="absolute inset-0 bg-black/54" />
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0.62)_100%)]" />

              <div className="relative z-10 flex h-full flex-col items-center justify-center px-5 text-center">
              {homeTitle ? (
                <h1 className="[font-family:var(--font-display)] max-w-[72rem] text-4xl font-black leading-tight text-white md:text-5xl lg:text-6xl">
                  {homeTitle}
                </h1>
              ) : null}

              {homeDescription ? (
                <p className="mx-auto mt-4 max-w-3xl text-base font-medium leading-8 text-white/88 md:text-xl">
                  {homeDescription}
                </p>
              ) : null}
              </div>
            </div>
          </div>

          <BookingSearchTabs className="mt-8" />
          <PartnersStrip className="mt-6" />
        </div>
      </section>

      <main className="relative z-10 mx-auto w-full max-w-[1500px] px-4 pb-16 sm:px-6 lg:px-8">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {pageCards.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => navigate(item.path)}
              className="homepage-feature-card group relative min-h-[17rem] overflow-hidden rounded-[1.9rem] p-5 text-left backdrop-blur-md transition"
            >
              <img
                src={item.image}
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover opacity-72 transition duration-500 group-hover:scale-105 group-hover:opacity-88"
                aria-hidden="true"
              />
              <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.28)_0%,rgba(0,0,0,0.54)_44%,rgba(0,0,0,0.82)_100%)] transition group-hover:bg-[linear-gradient(180deg,rgba(0,0,0,0.2)_0%,rgba(0,0,0,0.46)_44%,rgba(0,0,0,0.78)_100%)]" />
              <span className="relative z-10 flex h-full flex-col justify-end">
                <p className="homepage-feature-card__label text-xs font-semibold uppercase tracking-[0.26em] transition-colors">
                  {t(`home.cards.${item.key}.category`)}
                </p>
                <h2 className="homepage-feature-card__title [font-family:var(--font-display)] mt-3 text-2xl font-semibold transition-colors">
                  {t(`home.cards.${item.key}.title`)}
                </h2>
                <p className="homepage-feature-card__description mt-3 text-sm leading-8 transition-colors">
                  {t(`home.cards.${item.key}.text`)}
                </p>
              </span>
            </button>
          ))}
        </section>

        <div className="mt-8">
          <ReviewsSection relatedType="site" />
        </div>
      </main>

      <PublicFooter />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(180deg,rgba(17,17,17,0)_0%,rgba(17,17,17,0.7)_100%)]" />
    </div>
  );
}
