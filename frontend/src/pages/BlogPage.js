import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import LoadingSkeleton from "../components/LoadingSkeleton";
import PublicPageShell from "../components/PublicPageShell";
import SEO, { PAGE_SEO } from "../components/SEO";
import TravelImage from "../components/TravelImage";
import backgroundThree from "../assets/background/background-3.webp";
import { getLocalized, useLanguage } from "../i18n/LanguageContext";
import { fetchBlogs, fetchReviews, fetchTours } from "../lib/api";
import {
  formatCalendarDate,
  formatDateTimeLabel,
  getFriendlyApiError,
} from "../lib/formatters";

function getInitials(name) {
  return String(name || "G")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function BlogPage() {
  const { language, t } = useLanguage();
  const [blogs, setBlogs] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [toursById, setToursById] = useState({});
  const [blogsLoading, setBlogsLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [blogsError, setBlogsError] = useState("");
  const [reviewsError, setReviewsError] = useState("");

  useEffect(() => {
    const loadBlogs = async () => {
      setBlogsLoading(true);
      setBlogsError("");

      try {
        const response = await fetchBlogs();
        setBlogs(Array.isArray(response?.blogs) ? response.blogs : []);
      } catch (requestError) {
        setBlogsError(getFriendlyApiError(requestError, t("blog.errors.loadBlogs")));
      } finally {
        setBlogsLoading(false);
      }
    };

    const loadReviews = async () => {
      setReviewsLoading(true);
      setReviewsError("");

      try {
        const [reviewsResponse, toursResponse] = await Promise.all([
          fetchReviews(),
          fetchTours().catch(() => ({ tours: [] })),
        ]);
        const tours = Array.isArray(toursResponse?.tours) ? toursResponse.tours : [];

        setReviews(
          Array.isArray(reviewsResponse?.reviews) ? reviewsResponse.reviews : []
        );
        setToursById(
          tours.reduce((nextToursById, tour) => {
            if (tour?.id) {
              nextToursById[tour.id] = tour;
            }

            return nextToursById;
          }, {})
        );
      } catch (requestError) {
        setReviewsError(getFriendlyApiError(requestError, t("reviews.errors.loadFailed")));
      } finally {
        setReviewsLoading(false);
      }
    };

    void loadBlogs();
    void loadReviews();
  }, [t]);

  const heroContent = useMemo(
    () => ({
      eyebrow: t("blog.pageTitle"),
      title: t("blog.heroTitle"),
      description: t("blog.heroDescription"),
    }),
    [t]
  );

  return (
    <PublicPageShell
      backgroundImage={backgroundThree}
      eyebrow={heroContent.eyebrow}
      title={heroContent.title}
      description={heroContent.description}
      compactHero
    >
      <SEO {...PAGE_SEO.blog} />

      <section className="space-y-10">
        <div className="rounded-[2rem] border border-white/70 bg-white p-6 shadow-[0_30px_90px_-58px_rgba(15,23,42,0.55)] dark:border-white/10 dark:bg-[#071426] dark:shadow-[0_30px_90px_-58px_rgba(2,6,23,0.9)] lg:p-8">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-700 dark:text-cyan-300">
                {t("blog.sectionTitle")}
              </p>
              <h2 className="[font-family:var(--font-display)] mt-2 text-3xl font-semibold text-slate-950 dark:text-white">
                {t("blog.sectionTitle")}
              </h2>
            </div>
            {!blogsLoading ? (
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                {blogs.length}
              </p>
            ) : null}
          </div>

          <div className="mt-6">
            {blogsLoading ? <LoadingSkeleton /> : null}

            {!blogsLoading && blogsError ? (
              <EmptyState title={t("blog.sectionTitle")} message={blogsError} />
            ) : null}

            {!blogsLoading && !blogsError && blogs.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {blogs.map((blog) => (
                  <BlogCard key={blog.id} blog={blog} language={language} t={t} />
                ))}
              </div>
            ) : null}

            {!blogsLoading && !blogsError && blogs.length === 0 ? (
              <div className="rounded-[1.5rem] bg-slate-50 p-6 dark:bg-slate-800/70">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {t("blog.emptyBlogs")}
                </p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/70 bg-white p-6 shadow-[0_30px_90px_-58px_rgba(15,23,42,0.55)] dark:border-white/10 dark:bg-[#071426] dark:shadow-[0_30px_90px_-58px_rgba(2,6,23,0.9)] lg:p-8">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#d83f45] dark:text-[#ff8c90]">
                {t("blog.reviewsTitle")}
              </p>
              <h2 className="[font-family:var(--font-display)] mt-2 text-3xl font-semibold text-slate-950 dark:text-white">
                {t("blog.reviewsTitle")}
              </h2>
            </div>
            {!reviewsLoading ? (
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                {reviews.length}
              </p>
            ) : null}
          </div>

          <div className="mt-6">
            {reviewsLoading ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {[0, 1, 2].map((item) => (
                  <div
                    key={item}
                    className="h-56 animate-pulse rounded-[1.5rem] bg-slate-100 dark:bg-slate-800"
                  />
                ))}
              </div>
            ) : null}

            {!reviewsLoading && reviewsError ? (
              <EmptyState title={t("blog.reviewsTitle")} message={reviewsError} />
            ) : null}

            {!reviewsLoading && !reviewsError && reviews.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {reviews.map((review) => (
                  <PublicReviewCard
                    key={review.id}
                    review={review}
                    tour={toursById[review.tourId]}
                    language={language}
                    t={t}
                  />
                ))}
              </div>
            ) : null}

            {!reviewsLoading && !reviewsError && reviews.length === 0 ? (
              <div className="rounded-[1.5rem] bg-slate-50 p-6 dark:bg-slate-800/70">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {t("blog.emptyReviews")}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </PublicPageShell>
  );
}

function BlogCard({ blog, language, t }) {
  const title = getLocalized(blog.title, language);
  const excerpt = getLocalized(blog.excerpt, language);
  const category = getLocalized(blog.category, language);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[1.7rem] border border-slate-100 bg-slate-50 shadow-[0_24px_80px_-62px_rgba(15,23,42,0.7)] transition hover:-translate-y-1 hover:shadow-[0_28px_90px_-62px_rgba(15,23,42,0.9)] dark:border-white/10 dark:bg-slate-800/70">
      <TravelImage
        image={blog.image}
        title={title}
        subtitle={category}
        variant="blog"
        className="h-56"
      />

      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          {category ? (
            <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800 dark:bg-cyan-500/10 dark:text-cyan-100">
              {category}
            </span>
          ) : null}
          {blog.createdAt ? (
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              {formatCalendarDate(blog.createdAt, language)}
            </span>
          ) : null}
        </div>

        <h3 className="[font-family:var(--font-display)] mt-4 text-2xl font-semibold leading-tight text-slate-950 dark:text-white">
          {title}
        </h3>
        {excerpt ? (
          <p className="mt-3 line-clamp-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
            {excerpt}
          </p>
        ) : null}

        <Link
          to={`/blog/${blog.slug}`}
          className="mt-auto inline-flex self-start rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
        >
          {t("blog.readMore")}
        </Link>
      </div>
    </article>
  );
}

function PublicReviewCard({ review, tour, language, t }) {
  const tourTitle = getLocalized(tour?.title, language);
  const relatedText = [review.relatedType, tourTitle || review.tourId]
    .filter(Boolean)
    .join(" / ");

  return (
    <article className="h-full rounded-[1.5rem] border border-slate-100 bg-slate-50 p-5 dark:border-white/10 dark:bg-slate-800/70">
      <div className="flex items-start gap-3">
        {review.photoURL ? (
          <img
            src={review.photoURL}
            alt=""
            className="h-12 w-12 rounded-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white dark:bg-white dark:text-slate-950">
            {getInitials(review.name)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h3 className="break-words font-semibold text-slate-950 dark:text-white">
            {review.name}
          </h3>
          <div className="mt-2 flex text-amber-400" aria-hidden="true">
            {[1, 2, 3, 4, 5].map((value) => (
              <StarIcon key={value} filled={value <= review.rating} />
            ))}
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm leading-7 text-slate-700 dark:text-slate-300">
        {review.comment}
      </p>

      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        {relatedText ? <span>{relatedText}</span> : null}
        {review.createdAt ? (
          <span>{formatDateTimeLabel(review.createdAt, language)}</span>
        ) : (
          <span>{t("common.unknownDate")}</span>
        )}
      </div>
    </article>
  );
}

function StarIcon({ filled = true }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      aria-hidden="true"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
    </svg>
  );
}
