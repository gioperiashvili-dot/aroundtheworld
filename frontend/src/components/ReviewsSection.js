import { useCallback, useEffect, useMemo, useState } from "react";
import { useFirebaseAuth } from "../auth/FirebaseAuthContext";
import { useLanguage } from "../i18n/LanguageContext";
import { fetchReviews, submitReview } from "../lib/api";
import { formatCalendarDate, getFriendlyApiError } from "../lib/formatters";

const DEFAULT_RATING = 5;

function getInitials(name) {
  return String(name || "G")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function ReviewsSection({
  relatedType = "",
  tourId = "",
  title,
  description,
}) {
  const { language, t } = useLanguage();
  const {
    authConfigured,
    loading: authLoading,
    signInWithGoogle,
    signOutGoogle,
    user,
  } = useFirebaseAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [rating, setRating] = useState(DEFAULT_RATING);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const reviewParams = useMemo(() => {
    const params = {};

    if (relatedType) {
      params.relatedType = relatedType;
    }

    if (tourId) {
      params.tourId = tourId;
    }

    return params;
  }, [relatedType, tourId]);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetchReviews(reviewParams);
      setReviews(Array.isArray(response?.reviews) ? response.reviews : []);
    } catch (requestError) {
      setError(getFriendlyApiError(requestError, t("reviews.errors.loadFailed")));
    } finally {
      setLoading(false);
    }
  }, [reviewParams, t]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const handleSignIn = async () => {
    setSigningIn(true);
    setError("");
    setSuccess("");

    try {
      await signInWithGoogle(language);
    } catch (authError) {
      setError(
        authError?.code === "FIREBASE_NOT_CONFIGURED"
          ? t("reviews.errors.authNotConfigured")
          : t("reviews.errors.signInFailed")
      );
    } finally {
      setSigningIn(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!user) {
      setError(t("reviews.errors.loginRequired"));
      setSuccess("");
      return;
    }

    const trimmedComment = comment.trim();

    if (trimmedComment.length < 2) {
      setError(t("reviews.errors.commentRequired"));
      setSuccess("");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const idToken = await user.getIdToken();
      await submitReview(idToken, {
        rating,
        comment: trimmedComment,
        relatedType: relatedType || undefined,
        tourId: tourId || undefined,
      });

      setRating(DEFAULT_RATING);
      setComment("");
      setSuccess(t("reviews.pendingSuccess"));
    } catch (requestError) {
      const apiCode = requestError.response?.data?.code;
      setError(
        apiCode === "AUTH_REQUIRED" ||
          apiCode === "AUTH_TOKEN_INVALID" ||
          apiCode === "GOOGLE_SIGN_IN_REQUIRED" ||
          apiCode === "ANONYMOUS_REVIEW_BLOCKED"
          ? t("reviews.errors.loginRequired")
          : getFriendlyApiError(requestError, t("reviews.errors.submitFailed"), {
              unauthorizedMessage: t("reviews.errors.loginRequired"),
            })
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="rounded-[2rem] border border-white/70 bg-white p-6 shadow-[0_30px_90px_-58px_rgba(15,23,42,0.55)] dark:border-white/10 dark:bg-[#071426] dark:shadow-[0_30px_90px_-58px_rgba(2,6,23,0.9)] lg:p-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="space-y-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#d83f45] dark:text-[#ff8c90]">
                {t("reviews.sectionLabel")}
              </p>
              <h2 className="[font-family:var(--font-display)] mt-2 text-3xl font-semibold text-slate-950 dark:text-white">
                {title || t("reviews.heading")}
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-300">
                {description || t("reviews.description")}
              </p>
            </div>

            {loading ? (
              <div className="grid gap-3">
                {[0, 1].map((item) => (
                  <div
                    key={item}
                    className="h-32 animate-pulse rounded-[1.4rem] bg-slate-100 dark:bg-slate-800"
                  />
                ))}
              </div>
            ) : reviews.length > 0 ? (
              <div className="grid gap-4">
                {reviews.slice(0, 6).map((review) => (
                  <ReviewCard key={review.id} review={review} language={language} />
                ))}
              </div>
            ) : (
              <div className="rounded-[1.4rem] bg-slate-50 p-5 dark:bg-slate-800/70">
                <h3 className="font-semibold text-slate-950 dark:text-white">
                  {t("reviews.emptyTitle")}
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                  {t("reviews.emptyMessage")}
                </p>
              </div>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-5 dark:border-white/10 dark:bg-slate-950/55"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="[font-family:var(--font-display)] text-2xl font-semibold text-slate-950 dark:text-white">
                  {t("reviews.formHeading")}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {user
                    ? `${t("reviews.signedInAs")} ${user.displayName || user.email || ""}`
                    : t("reviews.signInToReview")}
                </p>
              </div>

              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    void signOutGoogle();
                    setSuccess("");
                    setError("");
                  }}
                  className="inline-flex justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  {t("reviews.signOut")}
                </button>
              ) : null}
            </div>

            {!user ? (
              <>
                <button
                  type="button"
                  onClick={handleSignIn}
                  disabled={!authConfigured || authLoading || signingIn}
                  className="mt-5 inline-flex w-full items-center justify-center gap-3 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 dark:disabled:bg-slate-700 dark:disabled:text-slate-300"
                >
                  <GoogleIcon />
                  {signingIn || authLoading
                    ? t("reviews.signingIn")
                    : t("reviews.signInButton")}
                </button>
                {!authConfigured ? (
                  <p className="mt-3 text-sm font-semibold text-amber-800 dark:text-amber-100">
                    {t("reviews.errors.authNotConfigured")}
                  </p>
                ) : null}
              </>
            ) : (
              <div className="mt-5 space-y-4">
                <div>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {t("reviews.ratingLabel")}
                  </span>
                  <div className="mt-2 flex gap-2" role="radiogroup">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRating(value)}
                        className={`flex h-11 w-11 items-center justify-center rounded-full transition ${
                          value <= rating
                            ? "bg-amber-400 text-slate-950"
                            : "bg-white text-slate-400 hover:text-amber-500 dark:bg-slate-800 dark:text-slate-500"
                        }`}
                        role="radio"
                        aria-checked={value === rating}
                        aria-label={`${value}`}
                      >
                        <StarIcon filled={value <= rating} />
                      </button>
                    ))}
                  </div>
                </div>

                <label className="block">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {t("reviews.commentLabel")}
                  </span>
                  <textarea
                    value={comment}
                    onChange={(event) => {
                      setComment(event.target.value);
                      if (error) {
                        setError("");
                      }
                    }}
                    rows={5}
                    maxLength={1500}
                    placeholder={t("reviews.commentPlaceholder")}
                    className="mt-2 w-full rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-[#e64d53]/60 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                  />
                </label>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex w-full justify-center rounded-full bg-[#e64d53] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#d83f45] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700"
                >
                  {submitting ? t("reviews.submitting") : t("reviews.submit")}
                </button>
              </div>
            )}

            {success ? (
              <p className="mt-4 rounded-[1.1rem] bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
                {success}
              </p>
            ) : null}

            {error ? (
              <p className="mt-4 rounded-[1.1rem] bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">
                {error}
              </p>
            ) : null}
          </form>
        </div>
      </div>
    </section>
  );
}

function ReviewCard({ review, language }) {
  return (
    <article className="rounded-[1.4rem] border border-slate-100 bg-white p-4 dark:border-white/10 dark:bg-slate-950/55">
      <div className="flex items-start gap-3">
        {review.photoURL ? (
          <img
            src={review.photoURL}
            alt=""
            className="h-11 w-11 rounded-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white dark:bg-white dark:text-slate-950">
            {getInitials(review.name)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3 className="font-semibold text-slate-950 dark:text-white">
              {review.name}
            </h3>
            <div className="flex text-amber-400" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((value) => (
                <StarIcon key={value} filled={value <= review.rating} />
              ))}
            </div>
          </div>
          <p className="mt-2 text-sm leading-7 text-slate-700 dark:text-slate-300">
            {review.comment}
          </p>
          {review.createdAt ? (
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              {formatCalendarDate(review.createdAt, language)}
            </p>
          ) : null}
        </div>
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

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.8 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.5c-.2 1.2-.9 2.3-2 3v2.5h3.2c1.9-1.8 3.1-4.4 3.1-7.3Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 5-0.9 6.7-2.5L15.5 17c-.9.6-2 .9-3.5.9-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6C4.8 19.7 8.2 22 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.4 13.8c-.2-.6-.3-1.2-.3-1.8s.1-1.2.3-1.8V7.6H3.1C2.4 8.9 2 10.4 2 12s.4 3.1 1.1 4.4l3.3-2.6Z"
      />
      <path
        fill="#EA4335"
        d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.9-2.9C17 3 14.7 2 12 2 8.2 2 4.8 4.3 3.1 7.6l3.3 2.6C7.2 7.9 9.4 6.1 12 6.1Z"
      />
    </svg>
  );
}
