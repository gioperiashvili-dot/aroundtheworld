import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AutocompleteInput from "../components/AutocompleteInput";
import EmptyState from "../components/EmptyState";
import LoadingSkeleton from "../components/LoadingSkeleton";
import PublicPageShell from "../components/PublicPageShell";
import RestaurantCard from "../components/RestaurantCard";
import backgroundOne from "../assets/background/background-1.jpg";
import {
  findLocation,
  getCitySearchValue,
  getLocationLabel,
  getLocationMeta,
  getLocationSuggestions,
} from "../data/locations";
import { useLanguage } from "../i18n/LanguageContext";
import { fetchRestaurants } from "../lib/api";
import { getFriendlyApiError } from "../lib/formatters";

function toLocationSuggestion(location, language) {
  return {
    id: location.id,
    primary: getLocationLabel(location, language),
    secondary: getLocationMeta(location, language),
    tag: location.code,
    value: getLocationLabel(location, language),
    location,
  };
}

export default function RestaurantsPage() {
  const { language, t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [city, setCity] = useState("");
  const [cityValue, setCityValue] = useState("");
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

  const citySuggestions = useMemo(
    () => getLocationSuggestions(city).map((location) => toLocationSuggestion(location, language)),
    [city, language]
  );

  useEffect(() => {
    const cityParam = searchParams.get("city") || "";
    const cityLocation = findLocation(cityParam);
    const cityLabel =
      searchParams.get("cityLabel") ||
      getLocationLabel(cityLocation, language) ||
      cityParam;

    setCity(cityLabel);
    setCityValue(cityLocation?.en || cityParam);

    if (!cityParam || searchParams.get("auto") !== "1") {
      return;
    }

    const searchKey = cityParam;

    if (lastAutoSearchRef.current === searchKey) {
      return;
    }

    lastAutoSearchRef.current = searchKey;

    void loadRestaurants(cityParam);
  }, [language, loadRestaurants, searchParams]);

  const handleSubmit = (event) => {
    event.preventDefault();

    const cityLocation = findLocation(cityValue || city);
    const normalizedCity = getCitySearchValue(cityLocation, city);
    const cityLabel = city.trim();

    if (!cityLabel) {
      setError(t("restaurants.errors.required"));
      return;
    }

    setError("");

    const params = new URLSearchParams({
      city: normalizedCity,
      cityLabel,
      auto: "1",
    });

    if (searchParams.toString() === params.toString()) {
      lastAutoSearchRef.current = normalizedCity;
      void loadRestaurants(normalizedCity);
      return;
    }

    setSearchParams(params);
  };

  const heroContent = t("app.pages.restaurants");

  return (
    <PublicPageShell
      backgroundImage={backgroundOne}
      eyebrow={heroContent.eyebrow}
      title={heroContent.title}
      description={t("restaurants.heroDescription")}
      highlights={Array.isArray(heroContent.highlights) ? heroContent.highlights : []}
      compactHero
    >
      <section className="space-y-6">
        <div className="overflow-visible rounded-[2rem] border border-white/70 bg-white/92 shadow-[0_30px_90px_-58px_rgba(15,23,42,0.55)] dark:border-white/10 dark:bg-slate-900/88 dark:shadow-[0_30px_90px_-58px_rgba(2,6,23,0.9)]">
          <div className="p-6 lg:p-8">
            <div className="space-y-5">
              <form className="grid gap-4 md:grid-cols-[1fr_auto]" onSubmit={handleSubmit}>
                <FieldCard>
                  <AutocompleteInput
                    label={t("common.city")}
                    value={city}
                    onChange={(value) => {
                      setCity(value);
                      setCityValue("");
                      if (error) {
                        setError("");
                      }
                    }}
                    onSelect={(suggestion) => {
                      setCity(suggestion.value);
                      setCityValue(suggestion.location.en);
                      if (error) {
                        setError("");
                      }
                    }}
                    suggestions={citySuggestions}
                    placeholder={t("restaurants.cityPlaceholder")}
                    noSuggestionsText={t("common.noSuggestions")}
                  />
                </FieldCard>

                <div className="flex items-stretch">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-[1.35rem] bg-slate-950 px-6 py-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700 dark:disabled:bg-slate-700 dark:disabled:text-slate-300"
                  >
                    {loading ? t("restaurants.searchingButton") : t("restaurants.searchButton")}
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

        {loading ? <LoadingSkeleton /> : null}

        {!loading && results.length > 0 ? (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-600 dark:text-slate-400">
                {t("restaurants.resultsLabel")}
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{results.length}</p>
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

function FieldCard({ children }) {
  return (
    <div className="rounded-[1.35rem] border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900/90">
      {children}
    </div>
  );
}
