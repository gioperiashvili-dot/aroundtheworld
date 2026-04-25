import { useEffect, useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";

const VARIANT_STYLES = {
  hotel: {
    gradient: "from-sky-500 via-cyan-500 to-emerald-400",
    accent: "bg-cyan-50/20 text-white",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        className="h-8 w-8"
        aria-hidden="true"
      >
        <path d="M4 20V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v13" />
        <path d="M8 9h.01M12 9h.01M16 9h.01M8 13h.01M12 13h.01M16 13h.01M3 20h18" />
      </svg>
    ),
  },
  restaurant: {
    gradient: "from-amber-300 via-orange-400 to-rose-500",
    accent: "bg-amber-50/20 text-white",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        className="h-8 w-8"
        aria-hidden="true"
      >
        <path d="M6 3v8M9 3v8M6 7h3M7.5 11v10M15 3c1.7 0 3 1.3 3 3v6h-3v9" />
      </svg>
    ),
  },
  tour: {
    gradient: "from-emerald-400 via-teal-500 to-cyan-600",
    accent: "bg-emerald-50/20 text-white",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        className="h-8 w-8"
        aria-hidden="true"
      >
        <path d="M12 21s7-4.35 7-10a7 7 0 1 0-14 0c0 5.65 7 10 7 10z" />
        <path d="M12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
      </svg>
    ),
  },
};

export default function TravelImage({
  image,
  title,
  subtitle,
  variant = "hotel",
  className = "h-64",
}) {
  const { t } = useLanguage();
  const [imageFailed, setImageFailed] = useState(false);
  const variantStyle = VARIANT_STYLES[variant] || VARIANT_STYLES.hotel;
  const variantLabel =
    variant === "restaurant"
      ? t("image.restaurantLabel")
      : variant === "tour"
        ? t("image.tourLabel")
        : t("image.hotelLabel");

  useEffect(() => {
    setImageFailed(false);
  }, [image]);

  const showImage = Boolean(image) && !imageFailed;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {showImage ? (
        <img
          src={image}
          alt={title || variantLabel}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          className={`relative flex h-full w-full flex-col justify-between bg-gradient-to-br ${variantStyle.gradient} p-5 text-white`}
        >
          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/18 blur-2xl" />
          <div className="absolute -bottom-12 left-0 h-32 w-32 rounded-full bg-slate-950/12 blur-3xl" />

          <div className="relative flex items-start justify-between gap-3">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${variantStyle.accent}`}>
              {variantLabel}
            </span>
            <div className="rounded-[1.3rem] bg-white/14 p-3 shadow-lg shadow-slate-950/10">
              {variantStyle.icon}
            </div>
          </div>

          <div className="relative">
            <p className="[font-family:var(--font-display)] text-2xl font-semibold leading-tight">
              {title || t("image.fallbackTitle")}
            </p>
            <p className="mt-2 max-w-xs text-sm text-white/82">
              {subtitle || t("image.fallbackSubtitle")}
            </p>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
    </div>
  );
}
