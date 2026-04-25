import TravelImage from "./TravelImage";
import { useLanguage } from "../i18n/LanguageContext";
import { formatReviewCount } from "../lib/formatters";

export default function RestaurantCard({ restaurant }) {
  const { language, t } = useLanguage();

  return (
    <article className="group overflow-hidden rounded-[2rem] border border-white/70 bg-white/92 shadow-[0_30px_90px_-58px_rgba(15,23,42,0.55)] transition duration-300 hover:-translate-y-1 dark:border-white/10 dark:bg-slate-900/88 dark:shadow-[0_30px_90px_-58px_rgba(2,6,23,0.9)]">
      <div className="relative">
        <TravelImage
          image={restaurant.image}
          title={restaurant.name}
          subtitle={restaurant.cuisine || t("image.restaurantLabel")}
          variant="restaurant"
          className="h-64"
        />

        {restaurant.priceTag ? (
          <div className="absolute right-5 top-5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-slate-950/15">
            {restaurant.priceTag}
          </div>
        ) : null}
      </div>

      <div className="space-y-5 p-5">
        <div>
          <h3 className="[font-family:var(--font-display)] text-2xl font-semibold text-slate-950 dark:text-white">
            {restaurant.name}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">
            {restaurant.city || t("restaurants.card.cityUnavailable")}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[1.4rem] bg-slate-50 p-4 dark:bg-slate-800/80">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-400">
              {t("common.rating")}
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">
              {restaurant.rating ? `${restaurant.rating}/5` : t("common.notRated")}
            </p>
          </div>

          <div className="rounded-[1.4rem] bg-slate-50 p-4 dark:bg-slate-800/80">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-400">
              {t("common.reviews")}
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">
              {formatReviewCount(restaurant.reviewCount, language) || t("common.noData")}
            </p>
          </div>

          <div className="rounded-[1.4rem] bg-slate-50 p-4 dark:bg-slate-800/80">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-400">
              {t("common.status")}
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">
              {restaurant.openStatus || t("restaurants.card.unknownStatus")}
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-400">
            {t("common.cuisine")}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {restaurant.cuisine || t("restaurants.card.variousCuisine")}
          </p>
        </div>

        {restaurant.menuUrl ? (
          <a
            href={restaurant.menuUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            {t("restaurants.card.viewMenu")}
          </a>
        ) : null}
      </div>
    </article>
  );
}
