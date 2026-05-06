import { useMemo } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { formatCalendarDate } from "../lib/formatters";

function getInitials(name) {
  return String(name || "G")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function AdminReviewsPanel({
  actionId = "",
  loading = false,
  onApprove,
  onDelete,
  reviews = [],
}) {
  const { language, t } = useLanguage();
  const counts = useMemo(
    () => ({
      pending: reviews.filter((review) => review.status === "pending").length,
      approved: reviews.filter((review) => review.status === "approved").length,
    }),
    [reviews]
  );

  return (
    <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/92 p-5 shadow-[0_30px_90px_-58px_rgba(15,23,42,0.55)] dark:border-white/10 dark:bg-slate-900/88 dark:shadow-[0_30px_90px_-58px_rgba(2,6,23,0.9)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#d83f45] dark:text-[#ff8c90]">
            {t("admin.reviewsLabel")}
          </p>
          <h3 className="[font-family:var(--font-display)] mt-2 text-3xl font-semibold text-slate-950 dark:text-white">
            {t("admin.reviewsHeading")}
          </h3>
        </div>
        <div className="flex flex-wrap gap-2 text-sm font-semibold">
          <span className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-800 dark:bg-amber-500/10 dark:text-amber-100">
            {counts.pending} {t("admin.reviewStatus.pending")}
          </span>
          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
            {counts.approved} {t("admin.reviewStatus.approved")}
          </span>
        </div>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[0, 1].map((item) => (
              <div
                key={item}
                className="h-52 animate-pulse rounded-[1.5rem] bg-slate-100 dark:bg-slate-800"
              />
            ))}
          </div>
        ) : reviews.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {reviews.map((review) => {
              const isPending = review.status === "pending";
              const isBusy = actionId === review.id;

              return (
                <article
                  key={review.id}
                  className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-5 dark:border-white/10 dark:bg-slate-800/70"
                >
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
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold text-slate-950 dark:text-white">
                          {review.name}
                        </h4>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            isPending
                              ? "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-100"
                              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200"
                          }`}
                        >
                          {t(`admin.reviewStatus.${review.status}`)}
                        </span>
                      </div>
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

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <ReviewMeta
                      label={t("admin.reviewRelated")}
                      value={review.relatedType || t("common.unknown")}
                    />
                    <ReviewMeta
                      label={t("common.date")}
                      value={
                        review.createdAt
                          ? formatCalendarDate(review.createdAt, language)
                          : t("common.unknownDate")
                      }
                    />
                    {review.tourId ? (
                      <ReviewMeta label={t("admin.reviewTourId")} value={review.tourId} />
                    ) : null}
                    <ReviewMeta label="UID" value={review.userId} />
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    {isPending ? (
                      <button
                        type="button"
                        onClick={() => onApprove(review.id)}
                        disabled={isBusy}
                        className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700"
                      >
                        {isBusy
                          ? t("admin.reviewActionWorking")
                          : t("admin.approveReview")}
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => onDelete(review.id)}
                      disabled={isBusy}
                      className="rounded-full bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/20"
                    >
                      {isBusy ? t("admin.reviewActionWorking") : t("admin.deleteAction")}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[1.5rem] bg-slate-50 p-6 dark:bg-slate-800/70">
            <h4 className="font-semibold text-slate-950 dark:text-white">
              {t("admin.noReviewsTitle")}
            </h4>
            <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
              {t("admin.noReviewsMessage")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewMeta({ label, value }) {
  return (
    <div className="rounded-[1.1rem] bg-white p-3 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function StarIcon({ filled = true }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
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
