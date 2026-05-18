import { useEffect, useMemo, useState } from "react";
import { getLocalized } from "../i18n/LanguageContext";
import { resolvePublicAssetUrl } from "../lib/api";

const TEXT = {
  ka: {
    eyebrow: "განთავსება",
    title: "სასტუმროების ვარიანტები",
    description: "იხილეთ ამ ტურისთვის ხელმისაწვდომი სასტუმროები და კვების პირობები.",
    location: "ლოკაცია",
    mealPlan: "კვება",
    viewHotel: "სასტუმროს ნახვა",
    noImage: "სასტუმროს ფოტო მალე დაემატება",
    previousImage: "წინა ფოტო",
    nextImage: "შემდეგი ფოტო",
  },
  en: {
    eyebrow: "Accommodation",
    title: "Hotel Options",
    description: "Review the hotels and meal plans available for this tour.",
    location: "Location",
    mealPlan: "Meal plan",
    viewHotel: "View Hotel",
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

      const stars = Number(hotel?.stars);

      return {
        id: String(hotel?.id || `hotel-${index + 1}`),
        name,
        location: getLocalizedHotelText(hotel?.location, language),
        mealPlan: getLocalizedHotelText(hotel?.mealPlan, language),
        stars: Number.isFinite(stars) && stars > 0 ? Math.min(Math.round(stars), 5) : null,
        link: String(hotel?.link || "").trim(),
        images: normalizeHotelImages(hotel),
      };
    })
    .filter(Boolean);
}

export default function TourHotelsSection({ hotels = [], language = "ka" }) {
  const text = TEXT[language] || TEXT.ka;
  const normalizedHotels = useMemo(
    () => normalizeHotels(hotels, language),
    [hotels, language]
  );

  if (normalizedHotels.length === 0) {
    return null;
  }

  return (
    <section className="mt-8 rounded-[1rem] border border-white/10 bg-[#202020] p-5 text-white shadow-[0_30px_90px_-60px_rgba(0,0,0,0.92)] md:p-7">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--aw-accent)]">
          {text.eyebrow}
        </p>
        <h2 className="[font-family:var(--font-display)] mt-3 text-3xl font-semibold text-white">
          {text.title}
        </h2>
        <p className="mt-3 text-sm leading-7 text-white/68">{text.description}</p>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {normalizedHotels.map((hotel) => (
          <TourHotelCard key={hotel.id} hotel={hotel} text={text} />
        ))}
      </div>
    </section>
  );
}

function TourHotelCard({ hotel, text }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedImages, setFailedImages] = useState(() => new Set());
  const availableImages = useMemo(
    () => hotel.images.filter((image) => !failedImages.has(image)),
    [failedImages, hotel.images]
  );
  const hasImages = availableImages.length > 0;
  const hasMultipleImages = availableImages.length > 1;
  const activeImage =
    availableImages[Math.min(activeIndex, Math.max(availableImages.length - 1, 0))] ||
    "";

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

  return (
    <article className="group overflow-hidden rounded-[1rem] border border-white/10 bg-[#171717] shadow-[0_26px_80px_-58px_rgba(0,0,0,0.95)] transition hover:-translate-y-0.5 hover:border-white/18">
      <div className="relative aspect-[16/10] overflow-hidden bg-[#111111]">
        {hasImages ? (
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
            <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-3">
              <HotelGalleryButton label={text.previousImage} onClick={goToPrevious}>
                <ChevronLeftIcon />
              </HotelGalleryButton>
              <HotelGalleryButton label={text.nextImage} onClick={goToNext}>
                <ChevronRightIcon />
              </HotelGalleryButton>
            </div>

            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2 rounded-full bg-black/55 px-3 py-2 backdrop-blur">
              {availableImages.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  aria-label={`${hotel.name} image ${index + 1}`}
                  onClick={() => setActiveIndex(index)}
                  className={`h-2.5 w-2.5 rounded-full transition ${
                    index === activeIndex
                      ? "bg-white"
                      : "bg-white/45 hover:bg-white/75"
                  }`}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      <div className="space-y-5 p-5">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h3 className="[font-family:var(--font-display)] text-2xl font-semibold leading-tight text-white">
              {hotel.name}
            </h3>
            {hotel.stars ? <StarRating stars={hotel.stars} /> : null}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {hotel.location ? (
              <HotelMeta label={text.location} value={hotel.location} />
            ) : null}
            {hotel.mealPlan ? (
              <HotelMeta label={text.mealPlan} value={hotel.mealPlan} />
            ) : null}
          </div>
        </div>

        {hotel.link ? (
          <a
            href={hotel.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-full bg-[var(--aw-accent)] px-5 py-3 text-sm font-black text-slate-950 shadow-[0_18px_42px_-28px_rgba(245,184,0,0.9)] transition hover:bg-[var(--aw-accent-hover)]"
          >
            {text.viewHotel}
          </a>
        ) : null}
      </div>
    </article>
  );
}

function HotelMeta({ label, value }) {
  return (
    <div className="rounded-[0.85rem] border border-white/10 bg-[#202020] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/48">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold leading-6 text-white/82">{value}</p>
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
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-black/62 text-white shadow-lg shadow-slate-950/20 backdrop-blur transition hover:bg-[var(--aw-accent)] hover:text-slate-950 focus:outline-none focus:ring-4 focus:ring-white/30"
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
