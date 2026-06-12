import { useCallback, useEffect, useMemo, useState } from "react";
import { useFirebaseAuth } from "../auth/FirebaseAuthContext";
import { useLanguage } from "../i18n/LanguageContext";
import { fetchReviews, submitReview } from "../lib/api";
import { SHOW_PUBLIC_REVIEWS } from "../lib/features";
import { formatDateTimeLabel, getFriendlyApiError } from "../lib/formatters";
import { getReviewAvatarSrc } from "../lib/reviewAvatars";

const DEFAULT_RATING = 5;
const PUBLIC_REVIEWS_LIMIT = 5;

function getInitials(name) {
  return String(name || "G")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getReviewTimestamp(review) {
  const value = review?.createdAt;

  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? timestamp : null;
  }

  if (typeof value.toDate === "function") {
    try {
      const timestamp = value.toDate().getTime();
      return Number.isFinite(timestamp) ? timestamp : null;
    } catch (error) {
      return null;
    }
  }

  const seconds = Number(value.seconds ?? value._seconds);
  const nanoseconds = Number(value.nanoseconds ?? value._nanoseconds ?? 0);

  if (!Number.isFinite(seconds)) {
    return null;
  }

  return seconds * 1000 + (Number.isFinite(nanoseconds) ? nanoseconds / 1000000 : 0);
}

function formatReviewCount(value, language) {
  return Number(value || 0).toLocaleString(language === "ka" ? "ka-GE" : "en-US");
}

export default function ReviewsSection({
  relatedType = "",
  tourId = "",
  title,
  description,
  backgroundImage = "",
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
  const [totalReviews, setTotalReviews] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [rating, setRating] = useState(DEFAULT_RATING);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [facebookReviewNotice, setFacebookReviewNotice] = useState(false);
  const reviewUser = user?.providerData?.some(
    (provider) => provider.providerId === "google.com"
  )
    ? user
    : null;

  const reviewParams = useMemo(() => {
    const params = {
      limit: PUBLIC_REVIEWS_LIMIT,
    };

    if (relatedType) {
      params.relatedType = relatedType;
    }

    if (tourId) {
      params.tourId = tourId;
    }

    return params;
  }, [relatedType, tourId]);

  const loadReviews = useCallback(async () => {
    if (!SHOW_PUBLIC_REVIEWS) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetchReviews(reviewParams);
      const responseReviews = Array.isArray(response?.reviews)
        ? response.reviews
        : Array.isArray(response)
          ? response
          : [];
      const responseTotal = Number(response?.total);

      setReviews(responseReviews);
      setTotalReviews(
        Number.isFinite(responseTotal) && responseTotal >= responseReviews.length
          ? responseTotal
          : responseReviews.length
      );
    } catch (requestError) {
      setError(getFriendlyApiError(requestError, t("reviews.errors.loadFailed")));
    } finally {
      setLoading(false);
    }
  }, [reviewParams, t]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const sectionBackgroundStyle = backgroundImage
    ? {
        backgroundImage: `linear-gradient(135deg, rgba(3, 16, 21, 0.9), rgba(3, 16, 21, 0.72)), url(${backgroundImage})`,
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
      }
    : undefined;
  const hasSectionBackground = Boolean(backgroundImage);
  const panelBackgroundClass = hasSectionBackground ? "bg-transparent" : "bg-[#202020]";
  const surfaceBackgroundClass = hasSectionBackground ? "bg-transparent" : "bg-[#171717]";
  const inputBackgroundClass = hasSectionBackground ? "bg-transparent" : "bg-[#202020]";
  const numericReviewRatings = useMemo(
    () =>
      reviews
        .map((review) => Number(review?.rating))
        .filter((reviewRating) => Number.isFinite(reviewRating) && reviewRating >= 1 && reviewRating <= 5),
    [reviews]
  );
  const averageReviewRating = numericReviewRatings.length
    ? numericReviewRatings.reduce((total, reviewRating) => total + reviewRating, 0) /
      numericReviewRatings.length
    : null;
  const reviewPanelCopy =
    language === "en"
      ? {
          title: "Leave a review",
          description: "Sign in with Google to write a review.",
          averageLabel: "Average rating",
          totalLabel: "Reviews",
          googleValue: "Google account",
          googleLabel: "Verified access",
          realReviews: "Real reviews",
          realReviewsLabel: "Shared by travelers",
          googleAuth: "Google authorization",
          googleAuthLabel: "Protected sign-in",
          userExperience: "Traveler experience",
          userExperienceLabel: "Useful context",
          facebookButton: "Review with Facebook",
          facebookNotice:
            "Facebook Reviews is currently being updated. You can leave a review with your Google account.",
          dismissNotice: "Close",
          helper:
            "Your experience helps us plan better journeys. Share your review with future Aroundworld travelers.",
        }
      : {
          title: "დატოვე შეფასება",
          description: "შეფასების დასაწერად შედი Google ანგარიშით.",
          averageLabel: "საშუალო შეფასება",
          totalLabel: "შეფასებები",
          googleValue: "Google ანგარიშით",
          googleLabel: "დადასტურებული წვდომა",
          realReviews: "რეალური შეფასებები",
          realReviewsLabel: "მოგზაურებისგან",
          googleAuth: "Google ავტორიზაცია",
          googleAuthLabel: "დაცული შესვლა",
          userExperience: "მომხმარებლის გამოცდილება",
          userExperienceLabel: "სასარგებლო კონტექსტი",
          facebookButton: "Facebook-ით შეფასება",
          facebookNotice:
            "ამჟამად Facebook Reviews განახლების პროცესშია. შეფასების დატოვება შეგიძლიათ Google ანგარიშის მეშვეობით.",
          dismissNotice: "დახურვა",
          helper:
            "შენი გამოცდილება დაგვეხმარება უკეთესი მოგზაურობის დაგეგმვაში. გაუზიარე შეფასება Aroundworld-ის მომავალ მოგზაურებს.",
        };
  const reviewTrustCards =
    averageReviewRating !== null
      ? [
          {
            value: `${averageReviewRating.toFixed(1)} ★`,
            label: reviewPanelCopy.averageLabel,
            isMetric: true,
          },
          {
            value: formatReviewCount(totalReviews, language),
            label: reviewPanelCopy.totalLabel,
            isMetric: true,
          },
          {
            value: reviewPanelCopy.googleValue,
            label: reviewPanelCopy.googleLabel,
          },
        ]
      : [
          {
            value: reviewPanelCopy.realReviews,
            label: reviewPanelCopy.realReviewsLabel,
          },
          {
            value: reviewPanelCopy.googleAuth,
            label: reviewPanelCopy.googleAuthLabel,
          },
          {
            value: reviewPanelCopy.userExperience,
            label: reviewPanelCopy.userExperienceLabel,
          },
        ];
  const orderedReviews = useMemo(
    () =>
      reviews
        .map((review, index) => ({
          review,
          index,
          timestamp: getReviewTimestamp(review),
        }))
        .sort((left, right) => {
          if (left.timestamp !== null && right.timestamp !== null) {
            return right.timestamp === left.timestamp
              ? left.index - right.index
              : right.timestamp - left.timestamp;
          }

          if (left.timestamp !== null) {
            return -1;
          }

          if (right.timestamp !== null) {
            return 1;
          }

          return left.index - right.index;
        })
        .map(({ review }) => review),
    [reviews]
  );
  const visibleReviews = orderedReviews.slice(0, PUBLIC_REVIEWS_LIMIT);
  const totalReviewCountLabel = `${t("reviews.totalCountPrefix")} ${formatReviewCount(
    totalReviews,
    language
  )}`;

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

  const handleGoogleReviewClick = () => {
    setFacebookReviewNotice(false);
    void handleSignIn();
  };

  const handleFacebookReviewClick = () => {
    setFacebookReviewNotice(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!reviewUser) {
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
      const idToken = await reviewUser.getIdToken();
      await submitReview(idToken, {
        rating,
        comment: trimmedComment,
        relatedType: relatedType || undefined,
        tourId: tourId || undefined,
      });

      setRating(DEFAULT_RATING);
      setComment("");
      setSuccess(t("reviews.pendingSuccess"));
      await loadReviews();
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

  if (!SHOW_PUBLIC_REVIEWS) {
    return null;
  }

  return (
    <section className="space-y-6">
      <div
        className={`rounded-[1rem] border border-white/10 ${panelBackgroundClass} p-6 text-white shadow-[0_30px_90px_-58px_rgba(0,0,0,0.92)] lg:p-8`}
        style={sectionBackgroundStyle}
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.04fr)_minmax(21rem,0.86fr)]">
          <div className="space-y-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--aw-accent)]">
                {t("reviews.sectionLabel")}
              </p>
              <h2 className="[font-family:var(--font-display)] mt-2 text-3xl font-semibold text-white">
                {title || t("reviews.heading")}
              </h2>
              <p className="mt-3 text-sm leading-7 text-white/68">
                {description || t("reviews.description")}
              </p>
            </div>

            {loading ? (
              <div className="grid gap-3">
                {[0, 1].map((item) => (
                  <div
                    key={item}
                    className="h-32 animate-pulse rounded-[1rem] bg-white/8"
                  />
                ))}
              </div>
            ) : visibleReviews.length > 0 ? (
              <>
                <div className="grid gap-4">
                  {visibleReviews.map((review) => (
                    <ReviewCard
                      key={review.id}
                      review={review}
                      language={language}
                      transparentBackground={hasSectionBackground}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className={`rounded-[1rem] border border-white/10 ${surfaceBackgroundClass} p-5`}>
                <h3 className="font-semibold text-white">
                  {t("reviews.emptyTitle")}
                </h3>
                <p className="mt-2 text-sm leading-7 text-white/66">
                  {t("reviews.emptyMessage")}
                </p>
              </div>
            )}

            {!loading && !error ? (
              <p className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-3 text-center text-sm font-semibold text-white/64">
                {totalReviewCountLabel}
              </p>
            ) : null}
          </div>

          <form
            onSubmit={handleSubmit}
            className={`flex h-full flex-col justify-between gap-5 rounded-[1rem] border border-white/10 ${surfaceBackgroundClass} p-5 lg:p-6`}
          >
            <div className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="[font-family:var(--font-display)] text-2xl font-semibold text-white">
                    {reviewPanelCopy.title}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-white/72">
                    {reviewUser
                      ? `${t("reviews.signedInAs")} ${reviewUser.displayName || reviewUser.email || ""}`
                      : reviewPanelCopy.description}
                  </p>
                </div>

                {reviewUser ? (
                  <button
                    type="button"
                    onClick={() => {
                      void signOutGoogle();
                      setSuccess("");
                      setError("");
                    }}
                    className="inline-flex justify-center rounded-full border border-white/10 bg-white/8 px-4 py-2 text-sm font-semibold text-white/72 transition hover:border-[var(--aw-accent)] hover:text-white"
                  >
                    {t("reviews.signOut")}
                  </button>
                ) : null}
              </div>

              {!reviewUser ? (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleGoogleReviewClick}
                    disabled={!authConfigured || authLoading || signingIn}
                    className="inline-flex w-full items-center justify-center gap-3 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
                  >
                    <GoogleIcon />
                    {signingIn || authLoading
                      ? t("reviews.signingIn")
                      : t("reviews.signInButton")}
                  </button>
                  <button
                    type="button"
                    onClick={handleFacebookReviewClick}
                    aria-describedby={facebookReviewNotice ? "facebook-review-notice" : undefined}
                    className="inline-flex w-full items-center justify-center gap-3 rounded-full border border-[#1877F2]/35 bg-[#1877F2]/10 px-5 py-3 text-sm font-semibold text-white/72 transition hover:-translate-y-0.5 hover:border-[#1877F2]/55 hover:bg-[#1877F2]/15 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1877F2]/70"
                  >
                    <FacebookIcon />
                    {reviewPanelCopy.facebookButton}
                  </button>
                  {facebookReviewNotice ? (
                    <div
                      id="facebook-review-notice"
                      className="rounded-[1rem] border border-[var(--aw-accent)]/30 bg-[#07191f]/72 p-4 text-sm leading-7 text-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                      role="status"
                    >
                      <div className="flex gap-3">
                        <p className="flex-1">{reviewPanelCopy.facebookNotice}</p>
                        <button
                          type="button"
                          onClick={() => setFacebookReviewNotice(false)}
                          className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-white/62 transition hover:border-[var(--aw-accent)] hover:text-white"
                        >
                          {reviewPanelCopy.dismissNotice}
                        </button>
                      </div>
                    </div>
                  ) : null}
                  {!authConfigured ? (
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-100">
                      {t("reviews.errors.authNotConfigured")}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <span className="text-sm font-semibold text-white/78">
                      {t("reviews.ratingLabel")}
                    </span>
                    <div className="mt-2 flex flex-wrap gap-2" role="radiogroup">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setRating(value)}
                          className={`flex h-11 w-11 items-center justify-center rounded-full transition ${
                            value <= rating
                              ? "bg-amber-400 text-slate-950"
                              : "border border-white/10 bg-white/8 text-white/36 hover:text-[var(--aw-accent)]"
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
                    <span className="text-sm font-semibold text-white/78">
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
                      rows={6}
                      maxLength={1500}
                      placeholder={t("reviews.commentPlaceholder")}
                      className={`mt-2 w-full rounded-[0.85rem] border border-white/10 ${inputBackgroundClass} px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/38 focus:border-[var(--aw-accent)]`}
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex w-full justify-center rounded-full bg-[var(--aw-accent)] px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-[var(--aw-accent-hover)] disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
                  >
                    {submitting ? t("reviews.submitting") : t("reviews.submit")}
                  </button>
                </div>
              )}

              {success ? (
                <p className="rounded-[1.1rem] bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
                  {success}
                </p>
              ) : null}

              {error ? (
                <p className="rounded-[1.1rem] bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">
                  {error}
                </p>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                {reviewTrustCards.map((card) => (
                  <div
                    key={`${card.value}-${card.label}`}
                    className="rounded-[0.9rem] border border-white/10 bg-white/[0.06] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                  >
                    <p
                      className={`break-words font-semibold leading-tight text-white ${
                        card.isMetric ? "text-2xl" : "text-sm"
                      }`}
                    >
                      {card.value}
                    </p>
                    <p className="mt-1 text-xs font-semibold uppercase leading-5 tracking-[0.12em] text-white/52">
                      {card.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1rem] border border-white/10 bg-white/[0.06] p-4 text-sm leading-7 text-white/74 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              {reviewPanelCopy.helper}
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

function ReviewCard({ review, language, transparentBackground = false }) {
  return (
    <article
      className={`rounded-[1rem] border border-white/10 ${
        transparentBackground ? "bg-transparent" : "bg-[#171717]"
      } p-4`}
    >
      <div className="flex items-start gap-3">
        <ReviewAvatar review={review} className="h-11 w-11" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3 className="font-semibold text-white">
              {review.name}
            </h3>
            <div className="flex text-amber-400" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((value) => (
                <StarIcon key={value} filled={value <= review.rating} />
              ))}
            </div>
          </div>
          <p className="mt-2 text-sm leading-7 text-white/68">
            {review.comment}
          </p>
          {review.createdAt ? (
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/46">
              {formatDateTimeLabel(review.createdAt, language)}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function ReviewAvatar({ review, className }) {
  const [imageFailed, setImageFailed] = useState(false);
  const avatarSrc = getReviewAvatarSrc(review);

  if (avatarSrc && !imageFailed) {
    return (
      <img
        src={avatarSrc}
        alt=""
        width="44"
        height="44"
        className={`${className} shrink-0 rounded-full object-cover`}
        loading="lazy"
        decoding="async"
        referrerPolicy={avatarSrc.startsWith("http") ? "no-referrer" : undefined}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <div
      className={`${className} flex shrink-0 items-center justify-center rounded-full bg-[var(--aw-accent)] text-sm font-black text-slate-950`}
    >
      {getInitials(review.name)}
    </div>
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

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="currentColor"
        d="M13.4 21v-7.2h2.4l.4-2.8h-2.8V9.2c0-.8.2-1.4 1.4-1.4h1.5V5.3c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.1H8v2.8h2.4V21h3Z"
      />
    </svg>
  );
}
