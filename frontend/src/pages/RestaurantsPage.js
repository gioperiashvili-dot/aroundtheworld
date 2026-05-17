import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import BookingSearchTabs from "../components/BookingSearchTabs";
import EmptyState from "../components/EmptyState";
import LoadingSkeleton from "../components/LoadingSkeleton";
import PublicPageShell from "../components/PublicPageShell";
import RestaurantCard from "../components/RestaurantCard";
import SEO, { PAGE_SEO } from "../components/SEO";
import backgroundOne from "../assets/background/background-6.webp";
import { useLanguage } from "../i18n/LanguageContext";
import { fetchRestaurants } from "../lib/api";
import { getFriendlyApiError } from "../lib/formatters";
import { buildWebPageStructuredData } from "../lib/structuredData";

export default function RestaurantsPage() {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const lastAutoSearchRef = useRef("");

  const loadRestaurants = useCallback(async (nextCity) => {
    setLoading(true);
    setError("");
    setHasSearched(true);

    try {
      const response = await fetchRestaurants({
        city: nextCity,
      });

      setResults(
        Array.isArray(response?.results)
          ? response.results
          : Array.isArray(response?.restaurants)
            ? response.restaurants
            : []
      );
    } catch (requestError) {
      setResults([]);
      setError(
        getFriendlyApiError(requestError, t("restaurants.errors.searchFailed"), {
          providerUnavailableMessage: t("common.providerUnavailable"),
        })
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const cityParam = searchParams.get("city") || "";

    if (!cityParam || searchParams.get("auto") !== "1") {
      return;
    }

    const searchKey = cityParam;

    if (lastAutoSearchRef.current === searchKey) {
      return;
    }

    lastAutoSearchRef.current = searchKey;

    void loadRestaurants(cityParam);
  }, [loadRestaurants, searchParams]);

  const handleRestaurantSearch = useCallback(
    (search, nextParams) => {
      setError("");

      if (searchParams.toString() === nextParams.toString()) {
        lastAutoSearchRef.current = search.city;
        void loadRestaurants(search.city);
        return;
      }

      setSearchParams(nextParams);
    },
    [loadRestaurants, searchParams, setSearchParams]
  );

  const heroContent = t("app.pages.restaurants");
  const webPageStructuredData = buildWebPageStructuredData(PAGE_SEO.restaurants);

  return (
    <PublicPageShell
      backgroundImage={backgroundOne}
      eyebrow={heroContent.eyebrow}
      title={heroContent.title}
      description={t("restaurants.heroDescription")}
      highlights={Array.isArray(heroContent.highlights) ? heroContent.highlights : []}
      compactHero
    >
      <SEO {...PAGE_SEO.restaurants} structuredData={webPageStructuredData} />
      <section className="space-y-6">
        <BookingSearchTabs
          defaultTab="restaurant"
          restaurantLoading={loading}
          onRestaurantSearch={handleRestaurantSearch}
        />

        {error ? (
          <div className="rounded-[1rem] border border-rose-400/20 bg-rose-500/10 px-6 py-4 text-sm font-semibold text-rose-100">
            {error}
          </div>
        ) : null}

        {loading ? <LoadingSkeleton /> : null}

        {!loading && results.length > 0 ? (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-white/60">
                {t("restaurants.resultsLabel")}
              </p>
              <p className="text-sm text-white/70">{results.length}</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {results.map((restaurant) => (
                <RestaurantCard
                  key={restaurant.id || restaurant.name}
                  restaurant={restaurant}
                />
              ))}
            </div>
          </section>
        ) : null}

        {!loading && !error && hasSearched && results.length === 0 ? (
          <EmptyState
            title={t("restaurants.empty.noResultsTitle")}
            message={t("restaurants.empty.noResultsMessage")}
          />
        ) : null}
      </section>
    </PublicPageShell>
  );
}
