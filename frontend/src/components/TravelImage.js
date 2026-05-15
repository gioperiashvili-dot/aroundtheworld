import { useEffect, useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { resolvePublicAssetUrl } from "../lib/api";

const VARIANT_STYLES = {
  hotel: {
    gradient: "from-[#151515] via-[#252018] to-[#6f5200]",
    accent: "bg-[rgba(245,184,0,0.18)] text-[var(--aw-accent)]",
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
    gradient: "from-[#151515] via-[#2a2418] to-[#8a6500]",
    accent: "bg-[rgba(245,184,0,0.18)] text-[var(--aw-accent)]",
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
    gradient: "from-[#151515] via-[#202020] to-[#6f5200]",
    accent: "bg-[rgba(245,184,0,0.18)] text-[var(--aw-accent)]",
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
  blog: {
    gradient: "from-[#151515] via-[#252018] to-[#6f5200]",
    accent: "bg-[rgba(245,184,0,0.18)] text-[var(--aw-accent)]",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        className="h-8 w-8"
        aria-hidden="true"
      >
        <path d="M6 4h9l3 3v13H6z" />
        <path d="M15 4v4h4" />
        <path d="M9 11h6M9 15h6M9 18h3" />
      </svg>
    ),
  },
};

export default function TravelImage({
  image,
  title,
  subtitle,
  alt,
  variant = "hotel",
  className = "h-64",
  width = 640,
  height = 384,
  loading = "lazy",
  fetchPriority,
}) {
  const { t } = useLanguage();
  const [imageFailed, setImageFailed] = useState(false);
  const variantStyle = VARIANT_STYLES[variant] || VARIANT_STYLES.hotel;
  const variantLabel =
    variant === "restaurant"
      ? t("image.restaurantLabel")
      : variant === "tour"
        ? t("image.tourLabel")
        : variant === "blog"
          ? t("image.blogLabel")
        : t("image.hotelLabel");

  useEffect(() => {
    setImageFailed(false);
  }, [image]);

  const showImage = Boolean(image) && !imageFailed;
  const imageSource = resolvePublicAssetUrl(image);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {showImage ? (
        <img
          src={imageSource}
          alt={getImageAlt({ alt, title, variant, variantLabel })}
          width={width}
          height={height}
          loading={loading}
          decoding="async"
          fetchPriority={fetchPriority}
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          className={`relative flex h-full w-full flex-col justify-between bg-gradient-to-br ${variantStyle.gradient} p-5 text-white`}
        >
          <div className="relative flex items-start justify-between gap-3">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${variantStyle.accent}`}>
              {variantLabel}
            </span>
            <div className="rounded-[1rem] border border-white/10 bg-black/24 p-3 text-[var(--aw-accent)] shadow-lg shadow-black/20">
              {variantStyle.icon}
            </div>
          </div>

          <div className="relative">
            <p className="[font-family:var(--font-display)] text-2xl font-semibold leading-tight">
              {title || t("image.fallbackTitle")}
            </p>
            <p className="mt-2 max-w-xs text-sm text-white/90">
              {subtitle || t("image.fallbackSubtitle")}
            </p>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
    </div>
  );
}

function getImageAlt({ alt, title, variant, variantLabel }) {
  const explicitAlt = String(alt || "").trim();

  if (explicitAlt) {
    return explicitAlt;
  }

  const imageTitle = String(title || "").trim();

  if (variant === "tour") {
    return imageTitle
      ? `${imageTitle} - ტური საქართველოდან Around The World`
      : "Around The World - ტური საქართველოდან";
  }

  return imageTitle || variantLabel;
}
