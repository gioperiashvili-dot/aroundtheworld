import { useEffect } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { TERMS_CONDITIONS_HREF } from "../lib/legalDocuments";

const TERMS_PREVIEW_TEXT = {
  ka: {
    title: "წესები და პირობები",
    summary:
      "ჯავშნის მოთხოვნის გაგზავნა არ ნიშნავს ავტომატურ დადასტურებას. ჩვენი ოპერატორი დაგიკავშირდებათ დეტალების დასაზუსტებლად. ჯავშანი დადასტურებულად ჩაითვლება მხოლოდ მომსახურების პირობების შეთანხმებისა და შესაბამისი გადახდის შემდეგ. ფასები და ხელმისაწვდომობა შეიძლება შეიცვალოს საბოლოო დადასტურებამდე.",
    viewFull: "სრული დოკუმენტის ნახვა",
    gotIt: "გასაგებია",
    close: "დახურვა",
  },
  en: {
    title: "Terms & Conditions",
    summary:
      "Submitting a booking request does not mean automatic confirmation. Our operator will contact you to confirm details. A booking is confirmed only after service conditions are agreed and the required payment is completed. Prices and availability may change before final confirmation.",
    viewFull: "View full document",
    gotIt: "Got it",
    close: "Close",
  },
};

export default function TermsPreviewModal({ isOpen, onClose }) {
  const { language } = useLanguage();
  const text = TERMS_PREVIEW_TEXT[language] || TERMS_PREVIEW_TEXT.ka;

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        event.stopImmediatePropagation?.();
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-preview-title"
      className="fixed inset-0 z-[130] flex items-end justify-center px-4 py-4 sm:items-center"
    >
      <button
        type="button"
        aria-label={text.close}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/72 backdrop-blur-sm"
      />

      <div className="relative w-full max-w-2xl rounded-[1.25rem] border border-white/10 bg-[#202020] p-5 text-white shadow-[0_34px_120px_-48px_rgba(0,0,0,0.95)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--aw-accent)]">
              Around The World
            </p>
            <h2
              id="terms-preview-title"
              className="[font-family:var(--font-display)] mt-2 text-2xl font-semibold text-white"
            >
              {text.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={text.close}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/12 text-lg font-semibold text-white/70 transition hover:border-[var(--aw-accent)] hover:text-white"
          >
            x
          </button>
        </div>

        <p className="mt-5 rounded-[1rem] border border-white/10 bg-[#171717] p-4 text-sm leading-7 text-white/78">
          {text.summary}
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <a
            href={TERMS_CONDITIONS_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-full border border-[var(--aw-accent)]/45 bg-[rgba(245,184,0,0.1)] px-5 py-3 text-sm font-semibold text-[var(--aw-accent)] transition hover:bg-[var(--aw-accent)] hover:text-slate-950"
          >
            {text.viewFull}
          </a>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-full bg-[var(--aw-accent)] px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-[var(--aw-accent-hover)]"
          >
            {text.gotIt}
          </button>
        </div>
      </div>
    </div>
  );
}
