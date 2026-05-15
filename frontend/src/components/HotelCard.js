import TravelImage from "./TravelImage";
import { useLanguage } from "../i18n/LanguageContext";
import { formatReviewCount } from "../lib/formatters";

export default function HotelCard({ hotel }) {
  const { language, t } = useLanguage();

  return (
    <article className="premium-service-card group overflow-hidden rounded-[1rem] border border-white/10 bg-[#242424] shadow-[0_30px_90px_-58px_rgba(0,0,0,0.92)] transition duration-300 hover:-translate-y-1 hover:border-white/18">
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

        <div className="absolute bottom-5 right-5 rounded-full bg-[var(--aw-accent)] px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-[rgba(245,184,0,0.18)]">
          {hotel.price}
        </div>
      </div>

      <div className="space-y-5 bg-[#242424] p-5 text-white">
        <div>
          <h3 className="[font-family:var(--font-display)] text-2xl font-semibold text-white">
            {hotel.name}
          </h3>
          <p className="mt-2 text-sm leading-6 text-white/66">
            {hotel.area || t("hotels.card.areaUnavailable")}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[0.9rem] border border-white/10 bg-[#1c1c1c] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/48">
              {t("common.rating")}
            </p>
            <p className="mt-2 text-lg font-semibold text-white">
              {hotel.rating ? `${hotel.rating}/5` : t("common.notRated")}
            </p>
          </div>

          <div className="rounded-[0.9rem] border border-white/10 bg-[#1c1c1c] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/48">
              {t("common.reviews")}
            </p>
            <p className="mt-2 text-lg font-semibold text-white">
              {formatReviewCount(hotel.reviewCount, language) || t("common.noData")}
            </p>
          </div>

          <div className="rounded-[0.9rem] border border-white/10 bg-[#1c1c1c] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/48">
              {t("common.provider")}
            </p>
            <p className="mt-2 text-lg font-semibold text-white">
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
          <p className="text-sm leading-6 text-white/68">{hotel.summary}</p>
        ) : null}

        {hotel.bookingUrl ? (
          <a
            href={hotel.bookingUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-full bg-[var(--aw-accent)] px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-[var(--aw-accent-hover)]"
          >
            {t("hotels.card.viewStay")}
          </a>
        ) : null}
      </div>
    </article>
  );
}
