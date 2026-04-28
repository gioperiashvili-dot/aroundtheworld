import { Link } from "react-router-dom";
import PublicPageShell from "../components/PublicPageShell";
import backgroundOne from "../assets/background/background-1.jpg";
import { useLanguage } from "../i18n/LanguageContext";

export default function VisaServicesPage() {
  const { t } = useLanguage();
  const heroContent = t("app.pages.visaServices");
  const sections = Array.isArray(t("visaServices.sections"))
    ? t("visaServices.sections")
    : [];

  return (
    <PublicPageShell
      backgroundImage={backgroundOne}
      eyebrow={heroContent.eyebrow}
      title={heroContent.title}
      description={heroContent.description}
      highlights={Array.isArray(heroContent.highlights) ? heroContent.highlights : []}
      compactHero
    >
      <section className="space-y-6">
        <article className="grid gap-6 rounded-[2rem] border border-white/70 bg-white/92 p-6 shadow-[0_30px_90px_-58px_rgba(15,23,42,0.55)] dark:border-white/10 dark:bg-slate-900/88 dark:shadow-[0_30px_90px_-58px_rgba(2,6,23,0.9)] md:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700 dark:text-emerald-300">
              {t("visaServices.introLabel")}
            </p>
            <h2 className="[font-family:var(--font-display)] mt-3 text-3xl font-semibold text-slate-950 dark:text-white">
              {t("visaServices.introTitle")}
            </h2>
            <p className="mt-4 text-sm leading-8 text-slate-700 dark:text-slate-300">
              {t("visaServices.introText")}
            </p>
          </div>

          <Link
            to="/contact"
            className="inline-flex items-center justify-center gap-2 rounded-[1.35rem] bg-slate-950 px-6 py-4 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          >
            {t("visaServices.cta")}
            <ArrowIcon />
          </Link>
        </article>

        <div className="grid gap-5 lg:grid-cols-2">
          {sections.map((section, index) => (
            <article
              key={section.title}
              className="rounded-[2rem] border border-white/70 bg-white/92 p-6 shadow-[0_24px_80px_-56px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-slate-900/88 dark:shadow-[0_24px_80px_-56px_rgba(2,6,23,0.8)]"
            >
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-400/20">
                  {index + 1}
                </span>
                <div>
                  <h3 className="[font-family:var(--font-display)] text-2xl font-semibold text-slate-950 dark:text-white">
                    {section.title}
                  </h3>
                  <ul className="mt-4 space-y-3">
                    {Array.isArray(section.items)
                      ? section.items.map((item) => (
                          <li
                            key={item}
                            className="flex gap-3 text-sm leading-7 text-slate-700 dark:text-slate-300"
                          >
                            <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#ff5a5f]" />
                            <span>{item}</span>
                          </li>
                        ))
                      : null}
                  </ul>
                </div>
              </div>
            </article>
          ))}
        </div>

        <article className="rounded-[2rem] border border-amber-200/80 bg-amber-50/95 p-6 shadow-[0_24px_80px_-56px_rgba(146,64,14,0.45)] dark:border-amber-300/20 dark:bg-amber-500/10 dark:shadow-[0_24px_80px_-56px_rgba(2,6,23,0.8)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-300/10 dark:text-amber-200 dark:ring-amber-200/20">
              <InfoIcon />
            </span>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-800 dark:text-amber-200">
                {t("visaServices.disclaimerLabel")}
              </p>
              <p className="mt-3 text-sm leading-8 text-amber-950 dark:text-amber-50">
                {t("visaServices.disclaimer")}
              </p>
            </div>
          </div>
        </article>
      </section>
    </PublicPageShell>
  );
}

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8" />
      <path d="M12 10.8v5" />
      <path d="M12 8h.01" />
    </svg>
  );
}
