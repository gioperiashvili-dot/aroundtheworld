import { useLanguage } from "../i18n/LanguageContext";

export default function TermsConsentCheckbox({
  checked,
  onChange,
  error = "",
  id = "terms-consent",
  onOpenTermsPreview,
}) {
  const { language } = useLanguage();
  const isEnglish = language === "en";
  const handleOpenPreview = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onOpenTermsPreview?.();
  };

  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className={`flex cursor-pointer items-start gap-3 rounded-[0.9rem] border px-4 py-3 text-sm leading-6 transition ${
          error
            ? "border-rose-300/35 bg-rose-500/10 text-rose-100"
            : "border-white/10 bg-white/[0.04] text-white/82 hover:border-[var(--aw-accent)]/50 hover:bg-white/[0.06]"
        }`}
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange?.(event.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 rounded border-white/30 bg-[#171717] accent-[var(--aw-accent)]"
        />
        <span>
          {isEnglish ? (
            <>
              I have read and agree to the{" "}
              <button
                type="button"
                className="font-semibold text-[var(--aw-accent)] underline-offset-4 transition hover:text-[var(--aw-accent-hover)] hover:underline"
                onClick={handleOpenPreview}
              >
                Terms & Conditions
              </button>
            </>
          ) : (
            <>
              წავიკითხე და ვეთანხმები{" "}
              <button
                type="button"
                className="font-semibold text-[var(--aw-accent)] underline-offset-4 transition hover:text-[var(--aw-accent-hover)] hover:underline"
                onClick={handleOpenPreview}
              >
                წესებს და პირობებს
              </button>
            </>
          )}
          {" "}
          {/* <a
            href={TERMS_CONDITIONS_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-white/72 underline-offset-4 transition hover:text-white hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            PDF
          </a> */}
        </span>
      </label>

      {error ? (
        <p className="rounded-[0.85rem] border border-rose-300/25 bg-rose-500/10 px-4 py-3 text-sm font-semibold leading-6 text-rose-100">
          {error}
        </p>
      ) : null}
    </div>
  );
}
