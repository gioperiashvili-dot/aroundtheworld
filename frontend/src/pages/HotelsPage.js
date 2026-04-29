import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AutocompleteInput from "../components/AutocompleteInput";
import EmptyState from "../components/EmptyState";
import HotelCard from "../components/HotelCard";
import LoadingSkeleton from "../components/LoadingSkeleton";
import PublicPageShell from "../components/PublicPageShell";
import SEO, { PAGE_SEO } from "../components/SEO";
import backgroundOne from "../assets/background/background-1.webp";
import {
  findLocation,
  getCitySearchValue,
  getLocationLabel,
  getLocationMeta,
  getLocationSuggestions,
} from "../data/locations";
import { useLanguage } from "../i18n/LanguageContext";
import { fetchHotels } from "../lib/api";
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

export default function HotelsPage() {
  const { language, t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [form, setForm] = useState({
    city: "",
    cityValue: "",
    checkIn: "",
    checkOut: "",
  });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const lastAutoSearchRef = useRef("");

  const loadHotels = useCallback(async (city, checkIn, checkOut) => {
    setLoading(true);
    setError("");
    setHasSearched(true);

    try {
      const response = await fetchHotels({
        city,
        checkIn,
        checkOut,
      });

      setResults(
        Array.isArray(response?.results)
          ? response.results
          : Array.isArray(response?.hotels)
            ? response.hotels
            : []
      );
    } catch (requestError) {
      setResults([]);
      setError(
        getFriendlyApiError(requestError, t("hotels.errors.searchFailed"), {
          providerUnavailableMessage: t("common.providerUnavailable"),
        })
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  const citySuggestions = useMemo(
    () => getLocationSuggestions(form.city).map((location) => toLocationSuggestion(location, language)),
    [form.city, language]
  );

  useEffect(() => {
    const cityParam = searchParams.get("city") || "";
    const cityLocation = findLocation(cityParam);
    const cityLabel =
      searchParams.get("cityLabel") ||
      getLocationLabel(cityLocation, language) ||
      cityParam;
    const checkIn = searchParams.get("checkIn") || "";
    const checkOut = searchParams.get("checkOut") || "";

    setForm({
      city: cityLabel,
      cityValue: cityLocation?.en || cityParam,
      checkIn,
      checkOut,
    });

    if (
      !cityParam ||
      !checkIn ||
      !checkOut ||
      searchParams.get("auto") !== "1" ||
      checkOut <= checkIn
    ) {
      return;
    }

    const searchKey = `${cityParam}|${checkIn}|${checkOut}`;

    if (lastAutoSearchRef.current === searchKey) {
      return;
    }

    lastAutoSearchRef.current = searchKey;

    void loadHotels(cityParam, checkIn, checkOut);
  }, [language, loadHotels, searchParams]);

  const handleSubmit = (event) => {
    event.preventDefault();

    const cityLocation = findLocation(form.cityValue || form.city);
    const city = getCitySearchValue(cityLocation, form.city);
    const cityLabel = form.city.trim();
    const checkIn = form.checkIn.trim();
    const checkOut = form.checkOut.trim();

    if (!cityLabel || !checkIn || !checkOut) {
      setError(t("hotels.errors.required"));
      return;
    }

    if (checkOut <= checkIn) {
      setError(t("hotels.errors.invalidDates"));
      return;
    }

    const params = new URLSearchParams({
      city,
      cityLabel,
      checkIn,
      checkOut,
      auto: "1",
    });

    setError("");

    if (searchParams.toString() === params.toString()) {
      const searchKey = `${city}|${checkIn}|${checkOut}`;
      lastAutoSearchRef.current = searchKey;
      void loadHotels(city, checkIn, checkOut);
      return;
    }

    setSearchParams(params);
  };

  const heroContent = t("app.pages.hotels");

  return (
    <PublicPageShell
      backgroundImage={backgroundOne}
      eyebrow={heroContent.eyebrow}
      title={heroContent.title}
      description={t("hotels.heroDescription")}
      highlights={Array.isArray(heroContent.highlights) ? heroContent.highlights : []}
      compactHero
    >
      <SEO {...PAGE_SEO.hotels} />
      <section className="space-y-6">
        <div className="overflow-visible rounded-[2rem] border border-white/70 bg-white/92 shadow-[0_30px_90px_-58px_rgba(15,23,42,0.55)] dark:border-white/10 dark:bg-slate-900/88 dark:shadow-[0_30px_90px_-58px_rgba(2,6,23,0.9)]">
          <div className="space-y-6 p-6 lg:p-8">
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid gap-4 xl:grid-cols-[1.12fr_0.92fr_0.92fr_auto]">
                <FieldCard>
                  <AutocompleteInput
                    label={t("common.city")}
                    value={form.city}
                    onChange={(value) => {
                      setForm((previousForm) => ({
                        ...previousForm,
                        city: value,
                        cityValue: "",
                      }));
                      if (error) {
                        setError("");
                      }
                    }}
                    onSelect={(suggestion) => {
                      setForm((previousForm) => ({
                        ...previousForm,
                        city: suggestion.value,
                        cityValue: suggestion.location.en,
                      }));
                      if (error) {
                        setError("");
                      }
                    }}
                    suggestions={citySuggestions}
                    placeholder={t("hotels.cityPlaceholder")}
                    noSuggestionsText={t("common.noSuggestions")}
                  />
                </FieldCard>

                <FieldCard>
                  <label className="block text-left">
                    <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-600 dark:text-slate-400">
                      {t("hotels.checkIn")}
                    </span>
                    <input
                      type="date"
                      name="checkIn"
                      value={form.checkIn}
                      onChange={(event) => {
                        setForm((previousForm) => ({
                          ...previousForm,
                          checkIn: event.target.value,
                        }));
                        if (error) {
                          setError("");
                        }
                      }}
                      className="mt-2 w-full bg-transparent text-sm font-medium text-slate-900 outline-none dark:text-white"
                    />
                  </label>
                </FieldCard>

                <FieldCard>
                  <label className="block text-left">
                    <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-600 dark:text-slate-400">
                      {t("hotels.checkOut")}
                    </span>
                    <input
                      type="date"
                      name="checkOut"
                      value={form.checkOut}
                      onChange={(event) => {
                        setForm((previousForm) => ({
                          ...previousForm,
                          checkOut: event.target.value,
                        }));
                        if (error) {
                          setError("");
                        }
                      }}
                      className="mt-2 w-full bg-transparent text-sm font-medium text-slate-900 outline-none dark:text-white"
                    />
                  </label>
                </FieldCard>

                <div className="flex items-stretch">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-[1.35rem] bg-slate-950 px-6 py-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700 dark:disabled:bg-slate-700 dark:disabled:text-slate-300"
                  >
                    {loading ? t("hotels.searchingButton") : t("hotels.searchButton")}
                  </button>
                </div>
              </div>
            </form>
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
                {t("hotels.resultsLabel")}
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{results.length}</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {results.map((hotel) => (
                <HotelCard key={hotel.id || hotel.name} hotel={hotel} />
              ))}
            </div>
          </section>
        ) : null}

        {!loading && !error && hasSearched && results.length === 0 ? (
          <EmptyState
            title={t("hotels.empty.noResultsTitle")}
            message={t("hotels.empty.noResultsMessage")}
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
