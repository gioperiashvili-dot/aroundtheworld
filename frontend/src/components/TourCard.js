import { Link } from "react-router-dom";
import TourDescription from "./TourDescription";
import TravelImage from "./TravelImage";
import { getLocalized, useLanguage } from "../i18n/LanguageContext";
import { formatCurrencyValue, formatTourDates } from "../lib/formatters";

export default function TourCard({ tour }) {
  const { language, t } = useLanguage();
  const dates = formatTourDates(tour.dates, 3, language);
  const title = getLocalized(tour.title, language);
  const destination = getLocalized(tour.destination, language);
  const description = getLocalized(tour.description, language);
  const duration = getLocalized(tour.duration, language);

  return (
    <article className="group overflow-hidden rounded-[2rem] border border-white/70 bg-white/92 shadow-[0_30px_90px_-58px_rgba(15,23,42,0.55)] transition duration-300 hover:-translate-y-1 dark:border-white/10 dark:bg-slate-900/88 dark:shadow-[0_30px_90px_-58px_rgba(2,6,23,0.9)]">
      <div className="relative">
        <TravelImage
          image={tour.image}
          title={title}
          subtitle={destination}
          variant="tour"
          className="h-64"
        />

        {tour.category ? (
          <div className="absolute left-5 top-5 rounded-full bg-slate-950/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
            {tour.category}
          </div>
        ) : null}

        <div className="absolute bottom-5 right-5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-slate-950/15">
          {formatCurrencyValue(tour.price, tour.currency, language)}
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div>
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{destination}</p>
          <h3 className="[font-family:var(--font-display)] mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
            {title}
          </h3>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1.4rem] bg-slate-50 p-4 dark:bg-slate-800/80">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-400">
              {t("common.duration")}
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">{duration}</p>
          </div>

          <div className="rounded-[1.4rem] bg-slate-50 p-4 dark:bg-slate-800/80">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-400">
              {t("common.price")}
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">
              {formatCurrencyValue(tour.price, tour.currency, language)}
            </p>
          </div>
        </div>

        <TourDescription description={description} compact />

        {dates.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {dates.map((date) => (
              <span
                key={date}
                className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200"
              >
                {date}
              </span>
            ))}
          </div>
        ) : null}

        <Link
          to={`/tours/${tour.id}`}
          className="inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {t("tours.openDetails")}
        </Link>
      </div>
    </article>
  );
}
