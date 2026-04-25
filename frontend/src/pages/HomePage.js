import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import HomeHeroSlider from "../components/HomeHeroSlider";
import Navbar from "../components/Navbar";
import PublicFooter from "../components/PublicFooter";
import AutocompleteInput from "../components/AutocompleteInput";
import {
  findLocation,
  getFlightSearchValue,
  getLocationLabel,
  getLocationMeta,
  getLocationSuggestions,
} from "../data/locations";
import { useLanguage } from "../i18n/LanguageContext";
import { PUBLIC_BACKGROUND_SLIDES } from "../lib/publicBackgrounds";

const SLIDER_INTERVAL_MS = 5600;
const QUICK_DESTINATIONS = ["IST", "CDG", "LHR", "DXB", "ATH"];

const HERO_SLIDES = PUBLIC_BACKGROUND_SLIDES;

function toLocationSuggestion(location, language) {
  return {
    id: location.code,
    primary: getLocationLabel(location, language),
    secondary: getLocationMeta(location, language),
    tag: location.code,
    value: getLocationLabel(location, language),
    location,
  };
}

export default function HomePage() {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const [activeSlide, setActiveSlide] = useState(0);
  const [form, setForm] = useState({
    from: "",
    fromCode: "",
    to: "",
    toCode: "",
    date: "",
    isHuman: false,
  });
  const [error, setError] = useState("");
  const homeEyebrow = t("home.eyebrow");
  const homeTitle = t("home.title");
  const homeDescription = t("home.description");

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveSlide((currentIndex) => (currentIndex + 1) % HERO_SLIDES.length);
    }, SLIDER_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const fromSuggestions = useMemo(
    () => getLocationSuggestions(form.from).map((location) => toLocationSuggestion(location, language)),
    [form.from, language]
  );
  const toSuggestions = useMemo(
    () => getLocationSuggestions(form.to).map((location) => toLocationSuggestion(location, language)),
    [form.to, language]
  );

  const handleSubmit = (event) => {
    event.preventDefault();

    const fromLocation = findLocation(form.fromCode || form.from);
    const toLocation = findLocation(form.toCode || form.to);
    const fromLabel = form.from.trim();
    const toLabel = form.to.trim();
    const date = form.date.trim();

    if (!fromLabel || !toLabel || !date) {
      setError(t("home.search.errors.required"));
      return;
    }

    if (!form.isHuman) {
      setError(t("home.search.errors.human"));
      return;
    }

    const params = new URLSearchParams({
      from: getFlightSearchValue(fromLocation, fromLabel),
      fromLabel,
      to: getFlightSearchValue(toLocation, toLabel),
      toLabel,
      date,
      human: "1",
      auto: "1",
    });

    navigate(`/flights?${params.toString()}`);
  };

  const pageCards = [
    { key: "flights", path: "/flights" },
    { key: "hotels", path: "/hotels" },
    { key: "restaurants", path: "/restaurants" },
    { key: "tours", path: "/tours" },
  ];

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-slate-950 text-slate-900 transition-colors dark:text-slate-100">
        <HomeHeroSlider
          slides={HERO_SLIDES}
          activeIndex={activeSlide}
          onSelect={setActiveSlide}
          showControls={false}
        />

      <section className="relative z-10">
        <div className="mx-auto flex min-h-[100svh] w-full max-w-[1500px] flex-col px-4 pb-20 pt-6 sm:px-6 lg:px-8">
          <Navbar variant="home" />

          <div className="flex flex-1 flex-col items-center justify-center pb-14 pt-16 text-center md:pt-24">
            <div className="max-w-4xl space-y-5">
              {homeEyebrow ? (
                <p className="inline-flex rounded-full border border-white/18 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.34em] text-white/82 backdrop-blur">
                  {homeEyebrow}
                </p>
              ) : null}

              {homeTitle ? (
                <h1 className="[font-family:var(--font-display)] text-4xl font-semibold leading-tight text-white md:text-6xl lg:text-7xl">
                  {homeTitle}
                </h1>
              ) : null}

              {homeDescription ? (
                <p className="mx-auto max-w-2xl text-base leading-8 text-white/78 md:text-lg">
                  {homeDescription}
                </p>
              ) : null}
            </div>

            <div className="mt-10 w-full max-w-[1360px]">
              <form
                onSubmit={handleSubmit}
                className="rounded-[2rem] bg-white/96 p-3 shadow-[0_35px_120px_-50px_rgba(15,23,42,0.95)] backdrop-blur md:rounded-[2.4rem] md:p-4 dark:bg-slate-950/88"
              >
                <div className="grid gap-3 xl:grid-cols-[1.12fr_1.12fr_0.9fr_auto]">
                  <div className="rounded-[1.35rem] border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900/90">
                    <AutocompleteInput
                      label={t("home.search.fromLabel")}
                      value={form.from}
                      onChange={(value) => {
                        setForm((previousForm) => ({
                          ...previousForm,
                          from: value,
                          fromCode: "",
                        }));
                        if (error) {
                          setError("");
                        }
                      }}
                      onSelect={(suggestion) => {
                        setForm((previousForm) => ({
                          ...previousForm,
                          from: suggestion.value,
                          fromCode: suggestion.location.code,
                        }));
                        if (error) {
                          setError("");
                        }
                      }}
                      suggestions={fromSuggestions}
                      placeholder={t("home.search.fromPlaceholder")}
                      noSuggestionsText={t("common.noSuggestions")}
                    />
                  </div>

                  <div className="rounded-[1.35rem] border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900/90">
                    <AutocompleteInput
                      label={t("home.search.toLabel")}
                      value={form.to}
                      onChange={(value) => {
                        setForm((previousForm) => ({
                          ...previousForm,
                          to: value,
                          toCode: "",
                        }));
                        if (error) {
                          setError("");
                        }
                      }}
                      onSelect={(suggestion) => {
                        setForm((previousForm) => ({
                          ...previousForm,
                          to: suggestion.value,
                          toCode: suggestion.location.code,
                        }));
                        if (error) {
                          setError("");
                        }
                      }}
                      suggestions={toSuggestions}
                      placeholder={t("home.search.toPlaceholder")}
                      noSuggestionsText={t("common.noSuggestions")}
                    />
                  </div>

                  <label className="rounded-[1.35rem] border border-slate-200 bg-white px-4 py-3 text-left dark:border-slate-800 dark:bg-slate-900/90">
                    <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
                      {t("home.search.dateLabel")}
                    </span>
                    <input
                      type="date"
                      name="date"
                      value={form.date}
                      onChange={(event) => {
                        setForm((previousForm) => ({
                          ...previousForm,
                          date: event.target.value,
                        }));
                        if (error) {
                          setError("");
                        }
                      }}
                      className="mt-2 w-full bg-transparent text-sm font-medium text-slate-900 outline-none dark:text-white"
                    />
                  </label>

                  <button
                    type="submit"
                    className="rounded-[1.35rem] bg-[#ff5a5f] px-7 py-4 text-sm font-semibold text-white transition hover:bg-[#ff4a50] focus:outline-none focus:ring-4 focus:ring-[#ff5a5f]/30"
                  >
                    {t("home.search.button")}
                  </button>
                </div>

                <div className="mt-4 flex flex-col gap-3 px-1 text-left md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center">
                    <label className="flex items-center gap-3 text-sm font-medium text-slate-600 dark:text-slate-200">
                      <input
                        type="checkbox"
                        name="isHuman"
                        checked={form.isHuman}
                        onChange={(event) => {
                          setForm((previousForm) => ({
                            ...previousForm,
                            isHuman: event.target.checked,
                          }));
                          if (error) {
                            setError("");
                          }
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-[#ff5a5f] focus:ring-[#ff5a5f]"
                      />
                      {t("home.search.humanCheck")}
                    </label>

                    <p className="text-sm text-slate-400 dark:text-slate-400">
                      {t("home.search.helper")}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
                      {t("common.popularDestinations")}
                    </span>
                    {QUICK_DESTINATIONS.map((code) => {
                      const location = findLocation(code);

                      if (!location) {
                        return null;
                      }

                      return (
                        <button
                          key={code}
                          type="button"
                          onClick={() =>
                            setForm((previousForm) => ({
                              ...previousForm,
                              to: getLocationLabel(location, language),
                              toCode: location.code,
                            }))
                          }
                          className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                        >
                          {getLocationLabel(location, language)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </form>

              {error ? (
                <div className="mx-auto mt-4 max-w-4xl rounded-2xl border border-rose-200/70 bg-rose-50/92 px-4 py-3 text-left text-sm text-rose-700 shadow-lg shadow-slate-950/10 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                  {error}
                </div>
              ) : null}

              <div className="mt-8 flex items-center justify-center gap-3">
                {HERO_SLIDES.map((slide, index) => (
                  <button
                    key={slide.image}
                    type="button"
                    onClick={() => setActiveSlide(index)}
                    className={`h-2.5 rounded-full transition-all ${
                      index === activeSlide
                        ? "w-10 bg-white"
                        : "w-2.5 bg-white/45 hover:bg-white/75"
                    }`}
                    aria-label={slide.label}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="relative z-10 mx-auto -mt-16 w-full max-w-[1500px] px-4 pb-16 sm:px-6 lg:px-8">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {pageCards.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => navigate(item.path)}
              className="homepage-feature-card group rounded-[1.9rem] p-5 text-left backdrop-blur-md transition"
            >
              <p className="homepage-feature-card__label text-xs font-semibold uppercase tracking-[0.26em] transition-colors">
                {t(`nav.${item.key}`)}
              </p>
              <h2 className="homepage-feature-card__title [font-family:var(--font-display)] mt-3 text-2xl font-semibold transition-colors">
                {t(`home.cards.${item.key}.title`)}
              </h2>
              <p className="homepage-feature-card__description mt-3 text-sm leading-8 transition-colors">
                {t(`home.cards.${item.key}.text`)}
              </p>
            </button>
          ))}
        </section>
      </main>

      <PublicFooter />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(180deg,rgba(2,6,23,0)_0%,rgba(2,6,23,0.44)_100%)]" />
    </div>
  );
}
