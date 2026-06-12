import { Link } from "react-router-dom";
import TourDescription from "./TourDescription";
import TravelImage from "./TravelImage";
import { getLocalized, useLanguage } from "../i18n/LanguageContext";
import { formatCurrencyValue, formatTourDates } from "../lib/formatters";
import { getTourCoverImage } from "../lib/tourImages";
import { getTourPublicPath } from "../lib/tourSlugs";

export default function TourCard({ tour }) {
  const { language, t } = useLanguage();
  const dates = formatTourDates(tour.dates, 3, language);
  const title = getLocalized(tour.title, language);
  const destination = getLocalized(tour.destination, language);
  const description = getLocalized(tour.description, language);
  const duration = getLocalized(tour.duration, language);
  const priceLabel =
    typeof tour.price === "number" ? formatCurrencyValue(tour.price, tour.currency, language) : "";

  return (
    <article className="aw-surface-card group overflow-hidden rounded-[1.35rem] text-white transition duration-300 hover:-translate-y-1 hover:border-[rgba(246,196,69,0.32)] hover:shadow-[0_34px_96px_-58px_rgba(0,0,0,0.95)]">
      <div className="relative overflow-hidden">
        <TravelImage
          image={getTourCoverImage(tour)}
          title={title}
          subtitle={destination}
          variant="tour"
          className="h-64 transition duration-500 group-hover:scale-105"
        />

        {tour.category ? (
          <div className="absolute left-5 top-5 rounded-full border border-white/12 bg-[#031015]/72 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
            {tour.category}
          </div>
        ) : null}
      </div>

      <div className="space-y-5 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--aw-accent)]">{destination}</p>
            <h3 className="[font-family:var(--font-display)] mt-2 text-2xl font-semibold text-white">
              {title}
            </h3>
          </div>

          {priceLabel ? (
            <span className="tour-price-chip inline-flex shrink-0 items-center justify-center rounded-full px-3.5 py-2 text-sm font-black">
              {priceLabel}
            </span>
          ) : null}
        </div>

        <div className="grid gap-3">
          <div className="rounded-[1rem] border border-white/10 bg-white/6 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/56">
              {t("common.duration")}
            </p>
            <p className="mt-2 text-lg font-semibold text-white">{duration}</p>
          </div>
        </div>

        <TourDescription description={description} compact className="text-white/68" />

        {dates.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {dates.map((date) => (
              <span
                key={date}
                className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-semibold text-white/72"
              >
                {date}
              </span>
            ))}
          </div>
        ) : null}

        <Link
          to={getTourPublicPath(tour)}
          className="aw-premium-button inline-flex rounded-full px-4 py-2 text-sm font-black text-slate-950 transition hover:-translate-y-0.5"
        >
          {t("tours.openDetails")}
        </Link>
      </div>
    </article>
  );
}
