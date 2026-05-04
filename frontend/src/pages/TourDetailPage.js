import { useCallback, useEffect, useState } from "react";
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
import { fetchTourById, submitTourBookingRequest } from "../lib/api";
import {
  formatCalendarDate,
  formatCurrencyValue,
  formatTourDates,
  getFriendlyApiError,
} from "../lib/formatters";

function getLocalizedList(value, language = "ka") {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  const items = Array.isArray(value[language])
    ? value[language]
    : Array.isArray(value.ka)
      ? value.ka
      : Array.isArray(value.en)
        ? value.en
        : [];

  return items
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

function getCurrentPageUrl() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.location.href;
}

function buildSelectedTourPayload({
  tour,
  title,
  destination,
  duration,
  dates,
  includedItems,
  notIncludedItems,
  price,
  category,
}) {
  return {
    id: tour.id,
    title,
    destination,
    price,
    duration,
    dates,
    category,
    included: includedItems,
    notIncluded: notIncludedItems,
    detailUrl: getCurrentPageUrl(),
  };
}

export default function TourDetailPage() {
  const { id } = useParams();
  const { language, t } = useLanguage();
  const [tour, setTour] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isBookingSuccessOpen, setIsBookingSuccessOpen] = useState(false);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [bookingForm, setBookingForm] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerMessage: "",
  });

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
  const includedItems = getLocalizedList(tour?.included, language);
  const notIncludedItems = getLocalizedList(tour?.notIncluded, language);
  const canonical = buildCanonicalUrl(`/tours/${encodeURIComponent(id || "")}`);
  const seoTitle = title
    ? language === "ka"
      ? `${title} | ტურები საქართველოდან | Around The World`
      : `${title} | Tours from Georgia | Around The World`
    : PAGE_SEO.tours.title;
  const seoDescription = buildTourSeoDescription({
    description,
    destination,
    duration,
    language,
  });
  const seoImage = tour?.image ? toAbsoluteUrl(tour.image) : undefined;

  const closeBookingModal = useCallback(() => {
    setIsBookingModalOpen(false);
    setBookingError("");
  }, []);

  const closeBookingSuccessModal = useCallback(() => {
    setIsBookingSuccessOpen(false);
  }, []);

  const handleBookingFieldChange = (event) => {
    const { name, value } = event.target;

    setBookingForm((previousForm) => ({
      ...previousForm,
      [name]: value,
    }));

    if (bookingError) {
      setBookingError("");
    }
  };

  const handleBookingSubmit = async (event) => {
    event.preventDefault();

    if (!tour) {
      return;
    }

    const trimmedForm = {
      customerName: bookingForm.customerName.trim(),
      customerEmail: bookingForm.customerEmail.trim(),
      customerPhone: bookingForm.customerPhone.trim(),
      customerMessage: bookingForm.customerMessage.trim(),
    };

    if (
      !trimmedForm.customerName ||
      !trimmedForm.customerEmail ||
      !trimmedForm.customerPhone
    ) {
      setBookingError(t("tours.bookingRequest.errors.required"));
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedForm.customerEmail)) {
      setBookingError(t("tours.bookingRequest.errors.email"));
      return;
    }

    setBookingSubmitting(true);
    setBookingError("");

    try {
      await submitTourBookingRequest({
        ...trimmedForm,
        selectedTour: buildSelectedTourPayload({
          tour,
          title,
          destination,
          duration,
          dates,
          includedItems,
          notIncludedItems,
          price: formatCurrencyValue(tour.price, tour.currency, language),
          category: tour.category,
        }),
        language,
      });

      setIsBookingModalOpen(false);
      setIsBookingSuccessOpen(true);
      setBookingForm({
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        customerMessage: "",
      });
    } catch (requestError) {
      const apiCode = requestError.response?.data?.code;
      setBookingError(
        apiCode === "EMAIL_NOT_CONFIGURED"
          ? t("tours.bookingRequest.errors.emailNotConfigured")
          : getFriendlyApiError(
              requestError,
              t("tours.bookingRequest.errors.sendFailed")
            )
      );
    } finally {
      setBookingSubmitting(false);
    }
  };

  return (
    <PublicPageShell
      backgroundImage={backgroundOne}
      eyebrow={t("tours.detailLabel")}
      title={title || t("tours.heading")}
      description={destination || t("tours.heroDescription")}
      heroAside={
        <div className="rounded-[2rem] border border-white/70 bg-white/90 p-5 text-slate-900 shadow-[0_24px_80px_-54px_rgba(15,23,42,0.55)] backdrop-blur dark:border-white/14 dark:bg-[#071426] dark:text-white dark:shadow-[0_24px_80px_-54px_rgba(15,23,42,0.88)]">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-600 dark:text-white/58">
            {t("common.price")}
          </p>
          <p className="mt-3 [font-family:var(--font-display)] text-4xl font-semibold">
            {tour ? formatCurrencyValue(tour.price, tour.currency, language) : "--"}
          </p>
          <p className="mt-4 text-sm leading-7 text-slate-700 dark:text-white/76">
            {duration || t("common.duration")}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row lg:flex-col">
            <button
              type="button"
              onClick={() => setIsBookingModalOpen(true)}
              disabled={!tour}
              className="inline-flex items-center justify-center rounded-full bg-[#e64d53] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#d83f45] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700"
            >
              {t("tours.bookTour")}
            </button>
            <Link
              to="/tours"
              className="inline-flex items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
            >
              {t("tours.backToTours")}
            </Link>
          </div>
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

            <div className="space-y-6 bg-white p-6 dark:bg-[#071426] md:p-8">
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
              <div className="rounded-[2rem] bg-white border border-white/70 bg-white p-6 shadow-[0_30px_90px_-58px_rgba(15,23,42,0.55)] dark:border-white/10 dark:bg-[#071426] dark:shadow-[0_30px_90px_-58px_rgba(2,6,23,0.9)]">
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
              <div className="rounded-[2rem] bg-white border border-white/70 bg-white p-6 shadow-[0_30px_90px_-58px_rgba(15,23,42,0.55)] dark:border-white/10 dark:bg-[#071426] dark:shadow-[0_30px_90px_-58px_rgba(2,6,23,0.9)]">
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-600 dark:text-slate-400">
                  {t("common.category")}
                </p>
                <p className="mt-3 text-xl font-semibold text-slate-950 dark:text-white">
                  {tour.category}
                </p>
              </div>
            ) : null}

            {includedItems.length > 0 ? (
              <TourListSection
                title={t("tours.includedTitle")}
                items={includedItems}
                variant="included"
              />
            ) : null}

            {notIncludedItems.length > 0 ? (
              <TourListSection
                title={t("tours.notIncludedTitle")}
                items={notIncludedItems}
                variant="notIncluded"
              />
            ) : null}
          </aside>
        </section>
      ) : null}

      {isBookingModalOpen && tour ? (
        <TourBookingRequestModal
          tour={tour}
          form={bookingForm}
          error={bookingError}
          isSubmitting={bookingSubmitting}
          language={language}
          title={title}
          destination={destination}
          duration={duration}
          dates={dates}
          includedItems={includedItems}
          notIncludedItems={notIncludedItems}
          t={t}
          onChange={handleBookingFieldChange}
          onClose={closeBookingModal}
          onSubmit={handleBookingSubmit}
        />
      ) : null}

      {isBookingSuccessOpen ? (
        <TourBookingSuccessModal t={t} onClose={closeBookingSuccessModal} />
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

function TourListSection({ title, items, variant }) {
  const isIncluded = variant === "included";

  return (
    <div className="rounded-[2rem] border border-white/70 bg-white p-6 shadow-[0_30px_90px_-58px_rgba(15,23,42,0.55)] dark:border-white/10 dark:bg-[#071426] dark:shadow-[0_30px_90px_-58px_rgba(2,6,23,0.9)]">
      <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-600 dark:text-slate-400">
        {title}
      </p>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li
            key={item}
            className="flex gap-3 text-sm leading-7 text-slate-700 dark:text-slate-300"
          >
            <span
              className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                isIncluded
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200"
                  : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200"
              }`}
            >
              {isIncluded ? <CheckIcon /> : <MinusIcon />}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TourBookingRequestModal({
  tour,
  form,
  error,
  isSubmitting,
  language,
  title,
  destination,
  duration,
  dates,
  includedItems,
  notIncludedItems,
  t,
  onChange,
  onClose,
  onSubmit,
}) {
  const selectedTour = buildSelectedTourPayload({
    tour,
    title,
    destination,
    duration,
    dates,
    includedItems,
    notIncludedItems,
    price: formatCurrencyValue(tour.price, tour.currency, language),
    category: tour.category,
  });
  const summaryRows = [
    { label: t("tours.selectedTour"), value: selectedTour.title },
    { label: t("common.destination"), value: selectedTour.destination },
    { label: t("common.price"), value: selectedTour.price },
    { label: t("common.duration"), value: selectedTour.duration },
    { label: t("tours.availableDates"), value: selectedTour.dates.join(", ") },
    { label: t("common.category"), value: selectedTour.category },
  ].filter((item) => String(item.value || "").trim());

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    const originalOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-booking-request-title"
      className="fixed inset-0 z-50 flex items-end justify-center px-4 py-4 sm:items-center"
    >
      <button
        type="button"
        aria-label={t("common.close")}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
      />

      <div className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] border border-white/70 bg-white p-5 shadow-[0_34px_120px_-48px_rgba(15,23,42,0.85)] dark:border-white/10 dark:bg-slate-950 dark:shadow-[0_34px_120px_-48px_rgba(2,6,23,0.95)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#d83f45] dark:text-[#ff8c90]">
              {t("tours.bookingRequest.eyebrow")}
            </p>
            <h2
              id="tour-booking-request-title"
              className="[font-family:var(--font-display)] mt-2 text-2xl font-semibold text-slate-950 dark:text-white"
            >
              {t("tours.bookingRequest.title")}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-lg font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-950 dark:border-slate-800 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:text-white"
          >
            x
          </button>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="rounded-[1.5rem] bg-slate-50 p-4 dark:bg-slate-900/70">
            <h3 className="text-sm font-semibold text-slate-950 dark:text-white">
              {t("tours.bookingRequest.selectedTour")}
            </h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {summaryRows.map((item) => (
                <TourMeta
                  key={`${item.label}-${item.value}`}
                  label={item.label}
                  value={item.value}
                />
              ))}
            </div>

            {includedItems.length > 0 ? (
              <CompactList title={t("tours.includedTitle")} items={includedItems} />
            ) : null}

            {notIncludedItems.length > 0 ? (
              <CompactList title={t("tours.notIncludedTitle")} items={notIncludedItems} />
            ) : null}
          </div>

          <form className="space-y-4" onSubmit={onSubmit} noValidate>
            <BookingTextField
              label={t("tours.bookingRequest.name")}
              name="customerName"
              value={form.customerName}
              onChange={onChange}
              required
            />
            <BookingTextField
              label={t("tours.bookingRequest.email")}
              name="customerEmail"
              type="email"
              value={form.customerEmail}
              onChange={onChange}
              required
            />
            <BookingTextField
              label={t("tours.bookingRequest.phone")}
              name="customerPhone"
              type="tel"
              value={form.customerPhone}
              onChange={onChange}
              required
            />
            <label className="block">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t("tours.bookingRequest.message")}
              </span>
              <textarea
                name="customerMessage"
                value={form.customerMessage}
                onChange={onChange}
                rows={4}
                className="mt-2 w-full rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[#e64d53]/60 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
            </label>

            <p className="rounded-[1.1rem] bg-amber-50 px-4 py-3 text-sm font-medium leading-6 text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
              {t("tours.bookingRequest.priceWarning")}
            </p>

            {error ? (
              <p className="rounded-[1.1rem] bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center rounded-full bg-[#e64d53] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_42px_-26px_rgba(216,63,69,0.9)] transition hover:bg-[#d83f45] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700 disabled:shadow-none"
            >
              {isSubmitting
                ? t("tours.bookingRequest.sending")
                : t("tours.bookingRequest.send")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function TourBookingSuccessModal({ t, onClose }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    const originalOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-booking-success-title"
      className="fixed inset-0 z-50 flex items-end justify-center px-4 py-4 sm:items-center"
    >
      <button
        type="button"
        aria-label={t("common.close")}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
      />

      <div className="relative w-full max-w-lg rounded-[2rem] border border-white/70 bg-white p-6 text-center shadow-[0_34px_120px_-48px_rgba(15,23,42,0.85)] dark:border-white/10 dark:bg-slate-950 sm:p-7">
        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-lg font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-950 dark:border-slate-800 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:text-white"
        >
          x
        </button>

        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
          <CheckIcon className="h-7 w-7" />
        </div>
        <h2
          id="tour-booking-success-title"
          className="[font-family:var(--font-display)] mt-5 text-2xl font-semibold text-slate-950 dark:text-white"
        >
          {t("tours.bookingRequest.successTitle")}
        </h2>
        <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
          {t("tours.bookingRequest.success")}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-[#e64d53] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_42px_-26px_rgba(216,63,69,0.9)] transition hover:bg-[#d83f45]"
        >
          {t("tours.bookingRequest.successAction")}
        </button>
      </div>
    </div>
  );
}

function BookingTextField({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
      </span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        className="mt-2 w-full rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[#e64d53]/60 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
      />
    </label>
  );
}

function TourMeta({ label, value }) {
  return (
    <div>
      <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <span className="mt-1 block break-words font-semibold text-slate-800 dark:text-slate-100">
        {value}
      </span>
    </div>
  );
}

function CompactList({ title, items }) {
  return (
    <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
        {title}
      </p>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li
            key={item}
            className="text-sm leading-6 text-slate-700 dark:text-slate-300"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CheckIcon({ className = "h-3.5 w-3.5" }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-3.5 w-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 12h12" />
    </svg>
  );
}
