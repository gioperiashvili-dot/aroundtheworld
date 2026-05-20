import { useEffect } from "react";

export default function AdminToast({
  type = "success",
  message = "",
  onClose,
  duration = 4200,
}) {
  const visibleMessage = String(message || "").trim();
  const isError = type === "error";

  useEffect(() => {
    if (!visibleMessage || duration <= 0) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      onClose?.();
    }, duration);

    return () => {
      window.clearTimeout(timer);
    };
  }, [duration, onClose, visibleMessage]);

  if (!visibleMessage) {
    return null;
  }

  return (
    <div
      className="fixed right-4 top-4 z-[140] w-[calc(100vw-2rem)] max-w-sm sm:right-6 sm:top-6"
      role="status"
      aria-live="polite"
    >
      <div
        className={`overflow-hidden rounded-[1.15rem] border p-4 text-white shadow-[0_26px_90px_-45px_rgba(0,0,0,0.9)] backdrop-blur ${
          isError
            ? "border-rose-300/28 bg-[#251516]/94"
            : "border-emerald-300/24 bg-[#132019]/94"
        }`}
      >
        <div className="flex items-start gap-3">
          <span
            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
              isError
                ? "bg-rose-400/18 text-rose-200"
                : "bg-[rgba(245,184,0,0.18)] text-[var(--aw-accent)]"
            }`}
            aria-hidden="true"
          >
            {isError ? "!" : "✓"}
          </span>
          <p className="min-w-0 flex-1 text-sm font-semibold leading-6">
            {visibleMessage}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/8 text-sm font-bold text-white/74 transition hover:bg-white/14 hover:text-white"
            aria-label="Close notification"
          >
            x
          </button>
        </div>
      </div>
    </div>
  );
}
