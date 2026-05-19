import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import LoadingSkeleton from "../components/LoadingSkeleton";
import PublicPageShell from "../components/PublicPageShell";
import SEO, { PAGE_SEO } from "../components/SEO";
import TourCard from "../components/TourCard";
import { useLanguage } from "../i18n/LanguageContext";
import { fetchTours } from "../lib/api";
import { getFriendlyApiError } from "../lib/formatters";
import { aroundWorldPageBackground } from "../lib/pageBackgrounds";
import { buildBreadcrumbStructuredData } from "../lib/structuredData";

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

function parsePriceValue(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const source = String(value ?? "").trim();

  if (!source) {
    return null;
  }

  const match = source.match(/\d[\d\s.,]*/);

  if (!match) {
    return null;
  }

  let numericText = match[0].replace(/\s/g, "");
  const lastCommaIndex = numericText.lastIndexOf(",");
  const lastDotIndex = numericText.lastIndexOf(".");

  if (lastCommaIndex > -1 && lastDotIndex > -1) {
    const decimalIndex = Math.max(lastCommaIndex, lastDotIndex);
    const integerPart = numericText.slice(0, decimalIndex).replace(/[,.]/g, "");
    const decimalPart = numericText.slice(decimalIndex + 1).replace(/[,.]/g, "");
    numericText = decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
  } else if (lastCommaIndex > -1) {
    const parts = numericText.split(",");
    const decimalPart = parts[parts.length - 1];
    numericText =
      parts.length === 2 && decimalPart.length <= 2
        ? `${parts[0]}.${decimalPart}`
        : numericText.replace(/,/g, "");
  } else if (lastDotIndex > -1) {
    const parts = numericText.split(".");
    const decimalPart = parts[parts.length - 1];
    numericText =
      parts.length === 2 && decimalPart.length <= 2
        ? numericText
        : numericText.replace(/\./g, "");
  }

  const parsedValue = Number.parseFloat(numericText);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function getTourPriceValue(tour) {
  return parsePriceValue(tour?.price);
}

function getPriceFilterValue(value) {
  const parsedValue = Number.parseFloat(String(value || "").replace(",", "."));
  return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : null;
}

export default function ToursPage() {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

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

  const selectedCategory = searchParams.get("category") || "__all";
  const activeQuery = searchParams.get("search") || "";
  const minPrice = searchParams.get("minPrice") || "";
  const maxPrice = searchParams.get("maxPrice") || "";
  const minPriceValue = useMemo(() => getPriceFilterValue(minPrice), [minPrice]);
  const maxPriceValue = useMemo(() => getPriceFilterValue(maxPrice), [maxPrice]);
  const hasPriceFilter = minPriceValue !== null || maxPriceValue !== null;
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
        const matchesSearch = matchesTourSearch(tour, activeQuery);

        if (!matchesCategory || !matchesSearch) {
          return false;
        }

        if (!hasPriceFilter) {
          return true;
        }

        const tourPrice = getTourPriceValue(tour);

        if (tourPrice === null) {
          return false;
        }

        if (minPriceValue !== null && tourPrice < minPriceValue) {
          return false;
        }

        if (maxPriceValue !== null && tourPrice > maxPriceValue) {
          return false;
        }

        return true;
      }),
    [
      activeQuery,
      hasPriceFilter,
      maxPriceValue,
      minPriceValue,
      selectedCategory,
      tours,
    ]
  );

  const hasActiveFilters =
    activeQuery ||
    selectedCategory !== "__all" ||
    minPrice ||
    maxPrice;

  const updateFilters = ({
    nextSearch = activeQuery,
    nextCategory = selectedCategory,
    nextMinPrice = minPrice,
    nextMaxPrice = maxPrice,
  } = {}) => {
    const params = new URLSearchParams();

    if (nextSearch.trim()) {
      params.set("search", nextSearch.trim());
    }

    if (nextCategory && nextCategory !== "__all") {
      params.set("category", nextCategory);
    }

    if (String(nextMinPrice || "").trim()) {
      params.set("minPrice", String(nextMinPrice).trim());
    }

    if (String(nextMaxPrice || "").trim()) {
      params.set("maxPrice", String(nextMaxPrice).trim());
    }

    setSearchParams(params);
  };

  const heroContent = t("app.pages.tours");
  const breadcrumbStructuredData = buildBreadcrumbStructuredData([
    { name: "Around The World", url: "/" },
    { name: "ტურები", url: "/tours" },
  ]);

  return (
    <PublicPageShell
      eyebrow={heroContent.eyebrow}
      title={heroContent.title}
      description={heroContent.description}
      backgroundImage={aroundWorldPageBackground}
      highlights={Array.isArray(heroContent.highlights) ? heroContent.highlights : []}
      compactHero
    >
      <SEO {...PAGE_SEO.tours} structuredData={breadcrumbStructuredData} />
      <section className="space-y-6">
        {!loading ? (
          <div className="rounded-[1rem] border border-white/10 bg-[#202020] p-4 text-white shadow-[0_26px_86px_-58px_rgba(0,0,0,0.92)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--aw-accent)]">
                  {t("tours.resultsLabel")}
                </p>
                <p className="mt-2 text-sm text-white/66">
                  {visibleTours.length}
                  {activeQuery ? ` / ${activeQuery}` : ""}
                </p>
              </div>

              <div className="relative w-full lg:w-80">
                <button
                  type="button"
                  onClick={() => setIsFiltersOpen((currentValue) => !currentValue)}
                  className="flex min-h-11 w-full items-center justify-between rounded-[0.85rem] border border-white/12 bg-[#171717] px-4 py-3 text-sm font-black uppercase text-white transition hover:border-[var(--aw-accent)] hover:bg-white/8"
                  aria-expanded={isFiltersOpen}
                >
                  <span>{t("tours.filters.label")}</span>
                  <span className="h-2 w-2 rotate-45 border-b border-r border-[var(--aw-accent)]" />
                </button>

                {isFiltersOpen ? (
                  <div className="mt-3 grid gap-4 rounded-[1rem] border border-white/10 bg-[#171717] p-4 shadow-[0_24px_70px_-44px_rgba(0,0,0,0.95)] lg:absolute lg:right-0 lg:top-full lg:z-20 lg:w-80">
                    <label className="grid gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/58">
                        {t("tours.filters.category")}
                      </span>
                      <select
                        value={selectedCategory}
                        onChange={(event) =>
                          updateFilters({ nextCategory: event.target.value })
                        }
                        className="min-h-11 rounded-[0.7rem] border border-white/10 bg-[var(--aw-input)] px-3 text-sm font-bold text-slate-950 outline-none transition focus:border-[var(--aw-accent)]"
                      >
                        {categories.map((category) => (
                          <option key={category.key} value={category.key}>
                            {category.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <fieldset className="grid gap-3">
                      <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-white/58">
                        {t("tours.filters.priceRange")}
                      </legend>

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                        <label className="grid gap-2">
                          <span className="text-xs font-semibold text-white/64">
                            {t("tours.filters.minPrice")}
                          </span>
                          <input
                            type="number"
                            min="0"
                            value={minPrice}
                            onChange={(event) =>
                              updateFilters({ nextMinPrice: event.target.value })
                            }
                            className="min-h-11 rounded-[0.7rem] border border-white/10 bg-[var(--aw-input)] px-3 text-sm font-bold text-slate-950 outline-none transition focus:border-[var(--aw-accent)]"
                          />
                        </label>

                        <label className="grid gap-2">
                          <span className="text-xs font-semibold text-white/64">
                            {t("tours.filters.maxPrice")}
                          </span>
                          <input
                            type="number"
                            min="0"
                            value={maxPrice}
                            onChange={(event) =>
                              updateFilters({ nextMaxPrice: event.target.value })
                            }
                            className="min-h-11 rounded-[0.7rem] border border-white/10 bg-[var(--aw-input)] px-3 text-sm font-bold text-slate-950 outline-none transition focus:border-[var(--aw-accent)]"
                          />
                        </label>
                      </div>
                    </fieldset>

                    {hasActiveFilters ? (
                      <button
                        type="button"
                        onClick={() =>
                          updateFilters({
                            nextSearch: "",
                            nextCategory: "__all",
                            nextMinPrice: "",
                            nextMaxPrice: "",
                          })
                        }
                        className="rounded-[0.7rem] border border-white/12 px-4 py-3 text-sm font-semibold text-white/74 transition hover:border-[var(--aw-accent)] hover:text-white"
                      >
                        {t("tours.filters.clear")}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {!loading && activeQuery ? (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => updateFilters({ nextSearch: "" })}
              className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm font-semibold text-white/74 transition hover:border-[var(--aw-accent)] hover:text-white"
            >
              {t("tours.clearSearch")}
            </button>
          </div>
        ) : null}

        {loading ? <LoadingSkeleton /> : null}

        {!loading && visibleTours.length > 0 ? (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/58">
                {t("tours.resultsLabel")}
              </p>
              <p className="text-sm text-white/70">{visibleTours.length}</p>
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
