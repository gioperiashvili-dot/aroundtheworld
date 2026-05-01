import TravelImage from "./TravelImage";
import { useLanguage } from "../i18n/LanguageContext";
import { formatReviewCount } from "../lib/formatters";

export default function HotelCard({ hotel }) {
  const { language, t } = useLanguage();

  return (
    <article className="group overflow-hidden rounded-[2rem] border border-white/70 bg-white/92 shadow-[0_30px_90px_-58px_rgba(15,23,42,0.55)] transition duration-300 hover:-translate-y-1 dark:border-white/10 dark:bg-slate-900/88 dark:shadow-[0_30px_90px_-58px_rgba(2,6,23,0.9)]">
      <div className="relative">
        <TravelImage
          image={hotel.image}
          title={hotel.name}
          subtitle={hotel.area || t("hotels.card.defaultSubtitle")}
          variant="hotel"
          className="h-64"
        />

        <div className="absolute left-5 top-5 rounded-full bg-slate-950/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
          {hotel.provider || "Tripadvisor"}
        </div>

        <div className="absolute bottom-5 right-5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-slate-950/15">
          {hotel.price}
        </div>
      </div>

      <div className="space-y-5 p-5 dark:bg-[#071426]">
        <div>
          <h3 className="[font-family:var(--font-display)] text-2xl font-semibold text-slate-950 dark:text-white">
            {hotel.name}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
            {hotel.area || t("hotels.card.areaUnavailable")}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[1.4rem] bg-slate-50 p-4 dark:bg-slate-800/80">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-600 dark:text-slate-400">
              {t("common.rating")}
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">
              {hotel.rating ? `${hotel.rating}/5` : t("common.notRated")}
            </p>
          </div>

          <div className="rounded-[1.4rem] bg-slate-50 p-4 dark:bg-slate-800/80">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-600 dark:text-slate-400">
              {t("common.reviews")}
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">
              {formatReviewCount(hotel.reviewCount, language) || t("common.noData")}
            </p>
          </div>

          <div className="rounded-[1.4rem] bg-slate-50 p-4 dark:bg-slate-800/80">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-600 dark:text-slate-400">
              {t("common.provider")}
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">
              {hotel.provider || "Tripadvisor"}
            </p>
          </div>
        </div>

        {hotel.priceDetails ? (
          <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
            {hotel.priceDetails}
          </p>
        ) : null}

        {hotel.summary ? (
          <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">{hotel.summary}</p>
        ) : null}

        {hotel.bookingUrl ? (
          <a
            href={hotel.bookingUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            {t("hotels.card.viewStay")}
          </a>
        ) : null}
      </div>
    </article>
  );
}
