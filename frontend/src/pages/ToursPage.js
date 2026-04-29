import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AutocompleteInput from "../components/AutocompleteInput";
import EmptyState from "../components/EmptyState";
import LoadingSkeleton from "../components/LoadingSkeleton";
import PublicPageShell from "../components/PublicPageShell";
import SEO, { PAGE_SEO } from "../components/SEO";
import TourCard from "../components/TourCard";
import backgroundTwo from "../assets/background/background-2.webp";
import { useLanguage } from "../i18n/LanguageContext";
import { fetchTours } from "../lib/api";
import { getFriendlyApiError } from "../lib/formatters";

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function matchesTourSearch(tour, query) {
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) {
    return true;
  }

  const values = [
    tour?.title?.ka,
    tour?.title?.en,
    tour?.destination?.ka,
    tour?.destination?.en,
    tour?.description?.ka,
    tour?.description?.en,
  ];

  return values.some((value) => normalize(value).includes(normalizedQuery));
}

export default function ToursPage() {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState(searchParams.get("search") || "");
  const searchInputRef = useRef(null);

  useEffect(() => {
    const loadTours = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetchTours();
        setTours(Array.isArray(response?.tours) ? response.tours : []);
      } catch (requestError) {
        setError(getFriendlyApiError(requestError, t("admin.errors.loadFailed")));
      } finally {
        setLoading(false);
      }
    };

    void loadTours();
  }, [t]);

  useEffect(() => {
    setSearchInput(searchParams.get("search") || "");
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get("focus") === "search" && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchParams]);

  const selectedCategory = searchParams.get("category") || "__all";
  const activeQuery = searchParams.get("search") || "";
  const categories = useMemo(
    () => [
      { key: "__all", label: t("common.all") },
      ...Array.from(new Set(tours.map((tour) => tour.category).filter(Boolean))).map(
        (category) => ({
          key: category,
          label: category,
        })
      ),
    ],
    [t, tours]
  );

  const visibleTours = useMemo(
    () =>
      tours.filter((tour) => {
        const matchesCategory =
          selectedCategory === "__all" || tour.category === selectedCategory;
        return matchesCategory && matchesTourSearch(tour, activeQuery);
      }),
    [activeQuery, selectedCategory, tours]
  );

  const suggestions = useMemo(() => {
    const normalizedQuery = normalize(searchInput);

    if (normalizedQuery.length < 2) {
      return [];
    }

    return tours
      .filter((tour) => matchesTourSearch(tour, searchInput))
      .slice(0, 6)
      .map((tour) => ({
        id: tour.id,
        primary: language === "en" ? tour.title?.en || tour.title?.ka : tour.title?.ka || tour.title?.en,
        secondary:
          language === "en"
            ? tour.destination?.en || tour.destination?.ka
            : tour.destination?.ka || tour.destination?.en,
        tag: tour.category || undefined,
        value:
          language === "en"
            ? tour.title?.en || tour.title?.ka || ""
            : tour.title?.ka || tour.title?.en || "",
        tour,
      }));
  }, [language, searchInput, tours]);

  const updateFilters = (nextSearch, nextCategory) => {
    const params = new URLSearchParams();

    if (nextSearch.trim()) {
      params.set("search", nextSearch.trim());
    }

    if (nextCategory && nextCategory !== "__all") {
      params.set("category", nextCategory);
    }

    setSearchParams(params);
  };

  const heroContent = t("app.pages.tours");

  return (
    <PublicPageShell
      backgroundImage={backgroundTwo}
      eyebrow={heroContent.eyebrow}
      title=""
      description=""
      highlights={[]}
      compactHero
    >
      <SEO {...PAGE_SEO.tours} />
      <section className="space-y-6">
        <div className="overflow-visible rounded-[2rem] border border-white/70 bg-white/92 shadow-[0_30px_90px_-58px_rgba(15,23,42,0.55)] dark:border-white/10 dark:bg-slate-900/88 dark:shadow-[0_30px_90px_-58px_rgba(2,6,23,0.9)]">
          <div className="p-6 lg:p-8">
            <div className="space-y-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700 dark:text-emerald-300">
                  {t("tours.sectionLabel")}
                </p>
                <h2 className="[font-family:var(--font-display)] mt-2 text-3xl font-semibold text-slate-950 dark:text-white">
                  {t("tours.heading")}
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-300">
                  {t("tours.helper")}
                </p>
              </div>

              <form
                className="grid gap-4 md:grid-cols-[1fr_auto]"
                onSubmit={(event) => {
                  event.preventDefault();
                  updateFilters(searchInput, selectedCategory);
                }}
              >
                <FieldCard>
                  <AutocompleteInput
                    label={t("tours.searchLabel")}
                    value={searchInput}
                    onChange={setSearchInput}
                    onSelect={(suggestion) => navigate(`/tours/${suggestion.tour.id}`)}
                    suggestions={suggestions}
                    placeholder={t("tours.searchPlaceholder")}
                    noSuggestionsText={t("common.noSuggestions")}
                    inputRef={searchInputRef}
                  />
                </FieldCard>

                <div className="flex items-stretch">
                  <button
                    type="submit"
                    className="w-full rounded-[1.35rem] bg-slate-950 px-6 py-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    {t("common.search")}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {error ? (
            <div className="border-t border-rose-100 bg-rose-50 px-6 py-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
              {error}
            </div>
          ) : null}
        </div>

        {!loading ? (
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.key}
                type="button"
                onClick={() => updateFilters(activeQuery, category.key)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  selectedCategory === category.key
                    ? "bg-slate-950 text-white"
                    : "border border-white/70 bg-white/92 text-slate-700 shadow-sm hover:bg-white dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                {category.label}
              </button>
            ))}

            {activeQuery ? (
              <button
                type="button"
                onClick={() => updateFilters("", selectedCategory)}
                className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-200 dark:hover:bg-emerald-500/20"
              >
                {t("tours.clearSearch")}
              </button>
            ) : null}
          </div>
        ) : null}

        {loading ? <LoadingSkeleton /> : null}

        {!loading && visibleTours.length > 0 ? (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-600 dark:text-slate-400">
                {t("tours.resultsLabel")}
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{visibleTours.length}</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {visibleTours.map((tour) => (
                <TourCard key={tour.id} tour={tour} />
              ))}
            </div>
          </section>
        ) : null}

        {!loading && !error && tours.length === 0 ? (
          <EmptyState title={t("tours.noToursTitle")} message={t("tours.noToursMessage")} />
        ) : null}

        {!loading && !error && tours.length > 0 && visibleTours.length === 0 ? (
          <EmptyState title={t("tours.noMatchTitle")} message={t("tours.noMatchMessage")} />
        ) : null}
      </section>
    </PublicPageShell>
  );
}

function FieldCard({ children }) {
  return (
    <div className="rounded-[1.35rem] border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900/90">
      {children}
    </div>
  );
}
