import TravelImage from "./TravelImage";
import { useLanguage } from "../i18n/LanguageContext";
import { formatReviewCount } from "../lib/formatters";

export default function RestaurantCard({ restaurant }) {
  const { language, t } = useLanguage();

  return (
    <article className="premium-service-card group overflow-hidden rounded-[1rem] border border-white/10 bg-[#242424] shadow-[0_30px_90px_-58px_rgba(0,0,0,0.92)] transition duration-300 hover:-translate-y-1 hover:border-white/18">
      <div className="relative">
        <TravelImage
          image={restaurant.image}
          title={restaurant.name}
          subtitle={restaurant.cuisine || t("image.restaurantLabel")}
          variant="restaurant"
          className="h-64"
        />

        {restaurant.priceTag ? (
          <div className="absolute right-5 top-5 rounded-full bg-[var(--aw-accent)] px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-[rgba(245,184,0,0.18)]">
            {restaurant.priceTag}
          </div>
        ) : null}
      </div>

      <div className="space-y-5 bg-[#242424] p-5 text-white">
        <div>
          <h3 className="[font-family:var(--font-display)] text-2xl font-semibold text-white">
            {restaurant.name}
          </h3>
          <p className="mt-2 text-sm leading-6 text-white/66">
            {restaurant.city || t("restaurants.card.cityUnavailable")}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[0.9rem] border border-white/10 bg-[#1c1c1c] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/48">
              {t("common.rating")}
            </p>
            <p className="mt-2 text-lg font-semibold text-white">
              {restaurant.rating ? `${restaurant.rating}/5` : t("common.notRated")}
            </p>
          </div>

          <div className="rounded-[0.9rem] border border-white/10 bg-[#1c1c1c] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/48">
              {t("common.reviews")}
            </p>
            <p className="mt-2 text-lg font-semibold text-white">
              {formatReviewCount(restaurant.reviewCount, language) || t("common.noData")}
            </p>
          </div>

          <div className="rounded-[0.9rem] border border-white/10 bg-[#1c1c1c] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/48">
              {t("common.status")}
            </p>
            <p className="mt-2 text-lg font-semibold text-white">
              {restaurant.openStatus || t("restaurants.card.unknownStatus")}
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/48">
            {t("common.cuisine")}
          </p>
          <p className="mt-2 text-sm leading-6 text-white/68">
            {restaurant.cuisine || t("restaurants.card.variousCuisine")}
          </p>
        </div>

        {restaurant.menuUrl ? (
          <a
            href={restaurant.menuUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-full bg-[var(--aw-accent)] px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-[var(--aw-accent-hover)]"
          >
            {t("restaurants.card.viewMenu")}
          </a>
        ) : null}
      </div>
    </article>
  );
}
