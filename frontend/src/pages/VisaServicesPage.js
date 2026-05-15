import { Link } from "react-router-dom";
import PublicPageShell from "../components/PublicPageShell";
import SEO, { PAGE_SEO } from "../components/SEO";
import backgroundOne from "../assets/background/background-1.webp";
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
      <SEO {...PAGE_SEO.visaServices} />
      <section className="space-y-6">
        <article className="grid gap-6 rounded-[1rem] border border-white/10 bg-[#202020] p-6 text-white shadow-[0_30px_90px_-60px_rgba(0,0,0,0.92)] md:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--aw-accent)]">
              {t("visaServices.introLabel")}
            </p>
            <h2 className="[font-family:var(--font-display)] mt-3 text-3xl font-semibold text-white">
              {t("visaServices.introTitle")}
            </h2>
            <p className="mt-4 text-sm leading-8 text-white/72">
              {t("visaServices.introText")}
            </p>
          </div>

          <Link
            to="/contact"
            className="inline-flex items-center justify-center gap-2 rounded-[0.85rem] bg-[var(--aw-accent)] px-6 py-4 text-sm font-black text-slate-950 transition hover:bg-[var(--aw-accent-hover)]"
          >
            {t("visaServices.cta")}
            <ArrowIcon />
          </Link>
        </article>

        <div className="grid gap-5 lg:grid-cols-2">
          {sections.map((section, index) => (
            <article
              key={section.title}
              className="rounded-[1rem] border border-white/10 bg-[#202020] p-6 text-white shadow-[0_24px_80px_-56px_rgba(0,0,0,0.9)]"
            >
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[rgba(245,184,0,0.16)] text-sm font-bold text-[var(--aw-accent)] ring-1 ring-[rgba(245,184,0,0.24)]">
                  {index + 1}
                </span>
                <div>
                  <h3 className="[font-family:var(--font-display)] text-2xl font-semibold text-white">
                    {section.title}
                  </h3>
                  <ul className="mt-4 space-y-3">
                    {Array.isArray(section.items)
                      ? section.items.map((item) => (
                          <li
                            key={item}
                            className="flex gap-3 text-sm leading-7 text-white/72"
                          >
                            <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--aw-accent)]" />
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

        <article className="rounded-[1rem] border border-amber-300/20 bg-amber-500/10 p-6 text-white shadow-[0_24px_80px_-56px_rgba(0,0,0,0.86)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-300/10 text-amber-200 ring-1 ring-amber-200/20">
              <InfoIcon />
            </span>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-200">
                {t("visaServices.disclaimerLabel")}
              </p>
              <p className="mt-3 text-sm leading-8 text-amber-50">
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
