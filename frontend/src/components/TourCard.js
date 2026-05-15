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

  return (
    <article className="group overflow-hidden rounded-[1rem] border border-white/10 bg-[#242424] text-white shadow-[0_30px_90px_-60px_rgba(0,0,0,0.92)] transition duration-300 hover:-translate-y-1 hover:border-white/18 hover:shadow-[0_34px_96px_-58px_rgba(0,0,0,0.95)]">
      <div className="relative">
        <TravelImage
          image={getTourCoverImage(tour)}
          title={title}
          subtitle={destination}
          variant="tour"
          className="h-64"
        />

        {tour.category ? (
          <div className="absolute left-5 top-5 rounded-full border border-white/12 bg-black/72 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
            {tour.category}
          </div>
        ) : null}

        <div className="absolute bottom-5 right-5 rounded-full bg-[var(--aw-accent)] px-4 py-2 text-sm font-black text-slate-950 shadow-lg shadow-slate-950/20">
          {formatCurrencyValue(tour.price, tour.currency, language)}
        </div>
      </div>

      <div className="space-y-5 bg-[#202020] p-5">
        <div>
          <p className="text-sm font-semibold text-[var(--aw-accent)]">{destination}</p>
          <h3 className="[font-family:var(--font-display)] mt-2 text-2xl font-semibold text-white">
            {title}
          </h3>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[0.9rem] border border-white/10 bg-[#171717] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/56">
              {t("common.duration")}
            </p>
            <p className="mt-2 text-lg font-semibold text-white">{duration}</p>
          </div>

          <div className="rounded-[0.9rem] border border-white/10 bg-[#171717] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/56">
              {t("common.price")}
            </p>
            <p className="mt-2 text-lg font-semibold text-white">
              {formatCurrencyValue(tour.price, tour.currency, language)}
            </p>
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
          className="inline-flex rounded-full bg-[var(--aw-accent)] px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-[var(--aw-accent-hover)]"
        >
          {t("tours.openDetails")}
        </Link>
      </div>
    </article>
  );
}
