import { useEffect, useMemo, useState } from "react";
import { getLocalized } from "../i18n/LanguageContext";
import { resolvePublicAssetUrl } from "../lib/api";

const TEXT = {
  ka: {
    eyebrow: "განთავსება",
    title: "სასტუმროების ვარიანტები",
    description: "იხილეთ ამ ტურისთვის ხელმისაწვდომი სასტუმროები.",
    reviews: "შეფასებები",
    rating: "რეიტინგი",
    mealPlan: "კვება",
    viewHotel: "სასტუმროს ნახვა",
    viewAllHotels: "ყველა სასტუმროს ნახვა",
    showLess: "ნაკლების ჩვენება",
    close: "დახურვა",
    noImage: "სასტუმროს ფოტო მალე დაემატება",
    previousImage: "წინა ფოტო",
    nextImage: "შემდეგი ფოტო",
  },
  en: {
    eyebrow: "Accommodation",
    title: "Hotel Options",
    description: "Review the hotels available for this tour.",
    reviews: "Reviews",
    rating: "rating",
    mealPlan: "Meal plan",
    viewHotel: "View Hotel",
    viewAllHotels: "View all hotels",
    showLess: "Show less",
    close: "Close",
    noImage: "Hotel photo will be added soon",
    previousImage: "Previous image",
    nextImage: "Next image",
  },
};

function getLocalizedHotelText(value, language) {
  return getLocalized(value, language) || String(value || "").trim();
}

function normalizeHotelImages(hotel) {
  const values = [
    ...(Array.isArray(hotel?.images) ? hotel.images : []),
    hotel?.image,
    hotel?.imageUrl,
    hotel?.coverImage,
  ];
  const seen = new Set();

  return values
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .filter((value) => {
      if (seen.has(value)) {
        return false;
      }

      seen.add(value);
      return true;
    })
    .map(resolvePublicAssetUrl);
}

function normalizeRating(value) {
  const parsedValue = Number.parseFloat(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsedValue) && parsedValue >= 0 && parsedValue <= 10
    ? Math.round(parsedValue * 10) / 10
    : null;
}

function normalizeReviewCount(value) {
  const normalizedValue = String(value ?? "").replace(/[,\s]/g, "");
  const parsedValue = Number.parseInt(normalizedValue, 10);
  return Number.isInteger(parsedValue) && parsedValue >= 0 ? parsedValue : null;
}

function normalizeStars(value) {
  const parsedValue = Number.parseFloat(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsedValue) && parsedValue > 0
    ? Math.min(Math.round(parsedValue), 5)
    : null;
}

function getHotelField(hotel, names) {
  for (const name of names) {
    if (hotel?.[name] !== undefined && hotel?.[name] !== null && hotel?.[name] !== "") {
      return hotel[name];
    }
  }

  return "";
}

function normalizeHotels(hotels, language) {
  if (!Array.isArray(hotels)) {
    return [];
  }

  return hotels
    .map((hotel, index) => {
      const name = getLocalizedHotelText(hotel?.name, language);

      if (!name) {
        return null;
      }

      return {
        id: String(hotel?.id || `hotel-${index + 1}`),
        name,
        location: getLocalizedHotelText(hotel?.location, language),
        mealPlan: getLocalizedHotelText(hotel?.mealPlan, language),
        stars: normalizeStars(getHotelField(hotel, ["stars", "starRating"])),
        rating: normalizeRating(getHotelField(hotel, ["rating", "reviewRating"])),
        reviewCount: normalizeReviewCount(
          getHotelField(hotel, ["reviewCount", "reviewsCount", "review_count"])
        ),
        link: String(hotel?.link || "").trim(),
        images: normalizeHotelImages(hotel),
      };
    })
    .filter(Boolean);
}

export default function TourHotelsSection({
  hotels = [],
  language = "ka",
  compact = false,
  grid = false,
  preview = false,
  initialVisibleCount,
  onImageOpen,
}) {
  const text = TEXT[language] || TEXT.ka;
  const [isExpanded, setIsExpanded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const normalizedHotels = useMemo(
    () => normalizeHotels(hotels, language),
    [hotels, language]
  );
  const normalizedHotelKey = useMemo(
    () => normalizedHotels.map((hotel) => hotel.id).join("|"),
    [normalizedHotels]
  );
  const resolvedInitialVisibleCount =
    typeof initialVisibleCount === "number"
      ? initialVisibleCount
      : preview
        ? 3
        : compact
        ? 4
        : normalizedHotels.length;
  const shouldCollapse =
    !preview &&
    resolvedInitialVisibleCount > 0 &&
    normalizedHotels.length > resolvedInitialVisibleCount;
  const shouldShowModalButton =
    preview &&
    resolvedInitialVisibleCount > 0 &&
    normalizedHotels.length > resolvedInitialVisibleCount;
  const visibleHotels =
    preview
      ? normalizedHotels.slice(0, resolvedInitialVisibleCount)
      : shouldCollapse && !isExpanded
      ? normalizedHotels.slice(0, resolvedInitialVisibleCount)
      : normalizedHotels;

  useEffect(() => {
    setIsExpanded(false);
    setIsModalOpen(false);
  }, [compact, grid, preview, initialVisibleCount, normalizedHotelKey]);

  if (normalizedHotels.length === 0) {
    return null;
  }

  return (
    <section
      className={`rounded-[1rem] border border-white/10 bg-[#202020] text-white shadow-[0_30px_90px_-60px_rgba(0,0,0,0.92)] ${
        compact ? "p-4" : "mt-8 p-5 md:p-7"
      }`}
    >
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--aw-accent)]">
          {text.eyebrow}
        </p>
        <h2
          className={`[font-family:var(--font-display)] mt-3 font-semibold text-white ${
            compact ? "text-2xl" : "text-3xl"
          }`}
        >
          {text.title}
        </h2>
        <p className="mt-3 text-sm leading-7 text-white/68">{text.description}</p>
      </div>

      <div
        className={`mt-6 grid gap-4 ${
          grid ? "sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"
        }`}
      >
        {visibleHotels.map((hotel) => (
          <TourHotelCard
            key={hotel.id}
            hotel={hotel}
            text={text}
            compact={compact}
            onImageOpen={onImageOpen}
          />
        ))}
      </div>

      {shouldShowModalButton ? (
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="mt-5 inline-flex w-full items-center justify-center rounded-full border border-[rgba(245,184,0,0.28)] bg-[rgba(245,184,0,0.1)] px-4 py-3 text-sm font-black text-[var(--aw-accent)] transition hover:border-[var(--aw-accent)] hover:bg-[rgba(245,184,0,0.16)]"
        >
          {`${text.viewAllHotels} (${normalizedHotels.length})`}
        </button>
      ) : shouldCollapse ? (
        <button
          type="button"
          onClick={() => setIsExpanded((currentValue) => !currentValue)}
          className="mt-5 inline-flex w-full items-center justify-center rounded-full border border-[rgba(245,184,0,0.28)] bg-[rgba(245,184,0,0.1)] px-4 py-3 text-sm font-black text-[var(--aw-accent)] transition hover:border-[var(--aw-accent)] hover:bg-[rgba(245,184,0,0.16)]"
        >
          {isExpanded
            ? text.showLess
            : `${text.viewAllHotels} (${normalizedHotels.length})`}
        </button>
      ) : null}

      {preview && isModalOpen ? (
        <HotelOptionsModal
          hotels={normalizedHotels}
          text={text}
          onClose={() => setIsModalOpen(false)}
          onImageOpen={onImageOpen}
        />
      ) : null}
    </section>
  );
}

function HotelOptionsModal({ hotels, text, onClose, onImageOpen }) {
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

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
      aria-label={text.title}
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/76 px-4 py-6 backdrop-blur-md"
    >
      <button
        type="button"
        aria-label={text.close}
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-[1.25rem] border border-white/12 bg-[#151515] text-white shadow-[0_34px_120px_-48px_rgba(0,0,0,0.95)]">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4 md:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--aw-accent)]">
              {text.eyebrow}
            </p>
            <h2 className="mt-2 [font-family:var(--font-display)] text-2xl font-semibold text-white md:text-3xl">
              {text.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/8 text-xl font-semibold text-white transition hover:border-[var(--aw-accent)] hover:text-[var(--aw-accent)]"
            aria-label={text.close}
          >
            x
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5 md:px-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {hotels.map((hotel) => (
              <TourHotelCard
                key={hotel.id}
                hotel={hotel}
                text={text}
                compact
                onImageOpen={onImageOpen}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TourHotelCard({ hotel, text, compact, onImageOpen }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedImages, setFailedImages] = useState(() => new Set());
  const availableImages = useMemo(
    () => hotel.images.filter((image) => !failedImages.has(image)),
    [failedImages, hotel.images]
  );
  const hasImages = availableImages.length > 0;
  const hasMultipleImages = availableImages.length > 1;
  const safeActiveIndex = Math.min(
    activeIndex,
    Math.max(availableImages.length - 1, 0)
  );
  const activeImage = availableImages[safeActiveIndex] || "";

  useEffect(() => {
    setActiveIndex(0);
    setFailedImages(new Set());
  }, [hotel.id]);

  useEffect(() => {
    setActiveIndex((currentIndex) =>
      Math.min(currentIndex, Math.max(availableImages.length - 1, 0))
    );
  }, [availableImages.length]);

  const goToPrevious = () => {
    setActiveIndex((currentIndex) =>
      currentIndex === 0 ? availableImages.length - 1 : currentIndex - 1
    );
  };

  const goToNext = () => {
    setActiveIndex((currentIndex) =>
      currentIndex >= availableImages.length - 1 ? 0 : currentIndex + 1
    );
  };

  const handleImageError = () => {
    if (!activeImage) {
      return;
    }

    setFailedImages((currentImages) => {
      if (currentImages.has(activeImage)) {
        return currentImages;
      }

      const nextImages = new Set(currentImages);
      nextImages.add(activeImage);
      return nextImages;
    });
  };

  const openImagePreview = () => {
    if (hasImages) {
      onImageOpen?.(availableImages, safeActiveIndex, hotel.name);
    }
  };

  return (
    <article className="group overflow-hidden rounded-[1rem] border border-white/10 bg-[#171717] shadow-[0_26px_80px_-58px_rgba(0,0,0,0.95)] transition hover:-translate-y-0.5 hover:border-white/18">
      <div className="relative aspect-[16/10] overflow-hidden bg-[#111111]">
        {hasImages ? (
          <button
            type="button"
            onClick={openImagePreview}
            className="block h-full w-full cursor-zoom-in"
            aria-label={`${hotel.name} preview`}
          >
            <img
              src={activeImage}
              alt={hotel.name}
              width="960"
              height="600"
              loading="lazy"
              decoding="async"
              onError={handleImageError}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            />
          </button>
        ) : (
          <div className="flex h-full w-full flex-col justify-between bg-[linear-gradient(135deg,#151515_0%,#252018_48%,#6f5200_100%)] p-5 text-white">
            <span className="w-fit rounded-full bg-[rgba(245,184,0,0.16)] px-3 py-1 text-xs font-semibold text-[var(--aw-accent)]">
              {text.eyebrow}
            </span>
            <div>
              <HotelIcon />
              <p className="mt-3 text-sm font-semibold text-white/78">{text.noImage}</p>
            </div>
          </div>
        )}

        {hasMultipleImages ? (
          <>
            <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-between px-3">
              <HotelGalleryButton label={text.previousImage} onClick={goToPrevious}>
                <ChevronLeftIcon />
              </HotelGalleryButton>
              <HotelGalleryButton label={text.nextImage} onClick={goToNext}>
                <ChevronRightIcon />
              </HotelGalleryButton>
            </div>

            <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2 rounded-full bg-black/55 px-3 py-2 backdrop-blur">
              {availableImages.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  aria-label={`${hotel.name} image ${index + 1}`}
                  onClick={() => setActiveIndex(index)}
                  className={`pointer-events-auto h-2.5 w-2.5 rounded-full transition ${
                    index === safeActiveIndex
                      ? "bg-white"
                      : "bg-white/45 hover:bg-white/75"
                  }`}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      <div className={`space-y-5 ${compact ? "p-4" : "p-5"}`}>
        <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h3
              className={`[font-family:var(--font-display)] font-semibold leading-tight text-white ${
                compact ? "text-xl" : "text-2xl"
              }`}
            >
              {hotel.name}
            </h3>
            {hotel.stars ? <StarRating stars={hotel.stars} /> : null}
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {hotel.mealPlan || hotel.rating !== null || hotel.reviewCount !== null ? (
              <HotelRating
                mealPlan={hotel.mealPlan}
                rating={hotel.rating}
                reviewCount={hotel.reviewCount}
                text={text}
              />
            ) : (
              <span className="hidden sm:block" aria-hidden="true" />
            )}

            {hotel.link ? (
              <a
                href={hotel.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center justify-center self-start rounded-full bg-[var(--aw-accent)] px-4 py-2.5 text-sm font-black text-slate-950 shadow-[0_18px_42px_-28px_rgba(245,184,0,0.9)] transition hover:bg-[var(--aw-accent-hover)] sm:self-auto"
              >
                {text.viewHotel}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function HotelRating({ mealPlan, rating, reviewCount, text }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[0.85rem] border border-[rgba(245,184,0,0.2)] bg-[rgba(245,184,0,0.08)] p-2.5">
      {mealPlan ? (
        <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-sm font-black text-white">
          {text.mealPlan}: {mealPlan}
        </span>
      ) : null}
      {reviewCount !== null ? (
        <span className="text-sm font-semibold text-white/72">
          {text.reviews} ({reviewCount.toLocaleString()})
        </span>
      ) : null}
      {rating !== null ? (
        <span className="rounded-full bg-[var(--aw-accent)] px-3 py-1.5 text-sm font-black text-slate-950">
          {rating.toFixed(1)} {text.rating}
        </span>
      ) : null}
    </div>
  );
}

function StarRating({ stars }) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[rgba(245,184,0,0.28)] bg-[rgba(245,184,0,0.13)] px-3 py-1.5 text-sm font-black text-[var(--aw-accent)]"
      aria-label={`${stars} star hotel`}
      title={`${stars}★`}
    >
      {Array.from({ length: stars }).map((_, index) => (
        <span key={index} aria-hidden="true">★</span>
      ))}
    </span>
  );
}

function HotelGalleryButton({ label, onClick, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
      className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-black/62 text-white shadow-lg shadow-slate-950/20 backdrop-blur transition hover:bg-[var(--aw-accent)] hover:text-slate-950 focus:outline-none focus:ring-4 focus:ring-white/30"
    >
      {children}
    </button>
  );
}

function HotelIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className="h-10 w-10 text-[var(--aw-accent)]"
      aria-hidden="true"
    >
      <path d="M4 20V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v13" />
      <path d="M8 9h.01M12 9h.01M16 9h.01M8 13h.01M12 13h.01M16 13h.01M3 20h18" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}
