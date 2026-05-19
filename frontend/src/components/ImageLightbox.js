import { useEffect, useMemo, useState } from "react";
import { resolvePublicAssetUrl } from "../lib/api";

export default function ImageLightbox({
  images = [],
  initialIndex = 0,
  isOpen,
  onClose,
  title = "",
}) {
  const normalizedImages = useMemo(
    () =>
      images
        .map((image) => String(image || "").trim())
        .filter(Boolean)
        .map(resolvePublicAssetUrl),
    [images]
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const hasMultipleImages = normalizedImages.length > 1;
  const activeImage = normalizedImages[activeIndex] || "";

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setActiveIndex(
      Math.min(Math.max(Number(initialIndex) || 0, 0), normalizedImages.length - 1)
    );
  }, [initialIndex, isOpen, normalizedImages.length]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }

      if (event.key === "ArrowLeft" && hasMultipleImages) {
        setActiveIndex((currentIndex) =>
          currentIndex === 0 ? normalizedImages.length - 1 : currentIndex - 1
        );
      }

      if (event.key === "ArrowRight" && hasMultipleImages) {
        setActiveIndex((currentIndex) =>
          currentIndex >= normalizedImages.length - 1 ? 0 : currentIndex + 1
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [hasMultipleImages, isOpen, normalizedImages.length, onClose]);

  if (!isOpen || normalizedImages.length === 0) {
    return null;
  }

  const goToPrevious = () => {
    setActiveIndex((currentIndex) =>
      currentIndex === 0 ? normalizedImages.length - 1 : currentIndex - 1
    );
  };

  const goToNext = () => {
    setActiveIndex((currentIndex) =>
      currentIndex >= normalizedImages.length - 1 ? 0 : currentIndex + 1
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title || "Image preview"}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/86 px-4 py-6 backdrop-blur-md"
    >
      <button
        type="button"
        aria-label="Close image preview"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />

      <div className="relative z-10 flex max-h-full w-full max-w-6xl flex-col items-center gap-4">
        <div className="relative flex max-h-[78vh] w-full items-center justify-center overflow-hidden rounded-[1.25rem] border border-white/12 bg-[#080909] shadow-[0_34px_120px_-48px_rgba(0,0,0,0.95)]">
          <img
            src={activeImage}
            alt={title || "Preview"}
            width="1440"
            height="960"
            decoding="async"
            className="max-h-[78vh] w-full object-contain"
          />

          {hasMultipleImages ? (
            <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-between px-3 sm:px-5">
              <LightboxButton label="Previous image" onClick={goToPrevious}>
                <ChevronLeftIcon />
              </LightboxButton>
              <LightboxButton label="Next image" onClick={goToNext}>
                <ChevronRightIcon />
              </LightboxButton>
            </div>
          ) : null}
        </div>

        <div className="flex w-full max-w-6xl items-center justify-between gap-3 text-white">
          <p className="min-w-0 truncate text-sm font-semibold text-white/78">
            {title}
          </p>
          <div className="flex shrink-0 items-center gap-3">
            {hasMultipleImages ? (
              <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-xs font-semibold text-white/72">
                {activeIndex + 1} / {normalizedImages.length}
              </span>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-white/8 text-xl font-semibold text-white transition hover:border-[var(--aw-accent)] hover:text-[var(--aw-accent)]"
              aria-label="Close image preview"
            >
              x
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LightboxButton({ label, onClick, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
      className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-black/62 text-white shadow-lg shadow-black/30 backdrop-blur transition hover:bg-[var(--aw-accent)] hover:text-slate-950 focus:outline-none focus:ring-4 focus:ring-white/30"
    >
      {children}
    </button>
  );
}

function ChevronLeftIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}
