import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import LoadingSkeleton from "../components/LoadingSkeleton";
import PublicPageShell from "../components/PublicPageShell";
import SEO, {
  PAGE_SEO,
  buildCanonicalUrl,
  buildTourSeoDescription,
  toAbsoluteUrl,
} from "../components/SEO";
import TourDescription from "../components/TourDescription";
import TravelImage from "../components/TravelImage";
import backgroundOne from "../assets/background/background-1.webp";
import { getLocalized, useLanguage } from "../i18n/LanguageContext";
import { fetchTourById } from "../lib/api";
import {
  formatCalendarDate,
  formatCurrencyValue,
  formatTourDates,
  getFriendlyApiError,
} from "../lib/formatters";

export default function TourDetailPage() {
  const { id } = useParams();
  const { language, t } = useLanguage();
  const [tour, setTour] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadTour = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetchTourById(id);
        setTour(response?.tour || null);
      } catch (requestError) {
        setTour(null);
        setError(getFriendlyApiError(requestError, t("tours.detailError")));
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      void loadTour();
    }
  }, [id, t]);

  const title = getLocalized(tour?.title, language);
  const destination = getLocalized(tour?.destination, language);
  const description = getLocalized(tour?.description, language);
  const duration = getLocalized(tour?.duration, language);
  const dates = formatTourDates(tour?.dates, 12, language);
  const canonical = buildCanonicalUrl(`/tours/${encodeURIComponent(id || "")}`);
  const seoTitle = title ? `${title} | Around The World` : PAGE_SEO.tours.title;
  const seoDescription = buildTourSeoDescription({
    description,
    destination,
    duration,
  });
  const seoImage = tour?.image ? toAbsoluteUrl(tour.image) : undefined;

  return (
    <PublicPageShell
      backgroundImage={backgroundOne}
      eyebrow={t("tours.detailLabel")}
      title={title || t("tours.heading")}
      description={destination || t("tours.heroDescription")}
      heroAside={
        <div className="rounded-[2rem] border border-white/70 bg-white/90 p-5 text-slate-900 shadow-[0_24px_80px_-54px_rgba(15,23,42,0.55)] backdrop-blur dark:border-white/14 dark:bg-white/10 dark:text-white dark:shadow-[0_24px_80px_-54px_rgba(15,23,42,0.88)]">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-600 dark:text-white/58">
            {t("common.price")}
          </p>
          <p className="mt-3 [font-family:var(--font-display)] text-4xl font-semibold">
            {tour ? formatCurrencyValue(tour.price, tour.currency, language) : "--"}
          </p>
          <p className="mt-4 text-sm leading-7 text-slate-700 dark:text-white/76">
            {duration || t("common.duration")}
          </p>
          <Link
            to="/tours"
            className="mt-6 inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
          >
            {t("tours.backToTours")}
          </Link>
        </div>
      }
    >
      <SEO
        title={seoTitle}
        description={seoDescription}
        canonical={canonical}
        ogUrl={canonical}
        ogType="article"
        ogImage={seoImage}
      />
      {loading ? <LoadingSkeleton count={1} className="xl:grid-cols-1" /> : null}

      {!loading && error ? (
        <EmptyState title={t("tours.noToursTitle")} message={error} />
      ) : null}

      {!loading && !error && tour ? (
        <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <article className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/92 shadow-[0_30px_90px_-58px_rgba(15,23,42,0.55)] dark:border-white/10 dark:bg-slate-900/88 dark:shadow-[0_30px_90px_-58px_rgba(2,6,23,0.9)]">
            <TravelImage
              image={tour.image}
              title={title}
              subtitle={destination}
              variant="tour"
              className="h-[22rem] md:h-[28rem]"
            />

            <div className="space-y-6 bg-white p-6 dark:bg-transparent md:p-8">
              <div className="grid gap-4 md:grid-cols-3">
                <StatCard label={t("common.duration")} value={duration} />
                <StatCard
                  label={t("common.price")}
                  value={formatCurrencyValue(tour.price, tour.currency, language)}
                />
                <StatCard
                  label={t("common.updated")}
                  value={
                    tour.updatedAt
                      ? formatCalendarDate(tour.updatedAt, language)
                      : t("common.recent")
                  }
                />
              </div>

              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700 dark:text-emerald-300">
                  {destination}
                </p>
                <h2 className="[font-family:var(--font-display)] mt-3 text-3xl font-semibold text-slate-950 dark:text-white">
                  {title}
                </h2>
                <TourDescription description={description} className="mt-4" />
              </div>
            </div>
          </article>

          <aside className="space-y-6">
            {dates.length > 0 ? (
              <div className="rounded-[2rem] bg-white border border-white/70 bg-white p-6 shadow-[0_30px_90px_-58px_rgba(15,23,42,0.55)] dark:border-white/10 dark:bg-transparent dark:shadow-[0_30px_90px_-58px_rgba(2,6,23,0.9)]">
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-600 dark:text-slate-400">
                  {t("tours.relatedDates")}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {dates.map((date) => (
                    <span
                      key={date}
                      className="rounded-full bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200"
                    >
                      {date}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {tour.category ? (
              <div className="rounded-[2rem] bg-white border border-white/70 bg-white p-6 shadow-[0_30px_90px_-58px_rgba(15,23,42,0.55)] dark:border-white/10 dark:bg-transparent dark:shadow-[0_30px_90px_-58px_rgba(2,6,23,0.9)]">
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-600 dark:text-slate-400">
                  {t("common.category")}
                </p>
                <p className="mt-3 text-xl font-semibold text-slate-950 dark:text-white">
                  {tour.category}
                </p>
              </div>
            ) : null}
          </aside>
        </section>
      ) : null}
    </PublicPageShell>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-[1.4rem] bg-slate-50 p-4 dark:bg-slate-800/80">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-600 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}
