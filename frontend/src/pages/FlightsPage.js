import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AutocompleteInput from "../components/AutocompleteInput";
import EmptyState from "../components/EmptyState";
import LoadingSkeleton from "../components/LoadingSkeleton";
import PublicPageShell from "../components/PublicPageShell";
import SEO, { PAGE_SEO } from "../components/SEO";
import backgroundTwo from "../assets/background/background-2.webp";
import {
  findLocation,
  getFlightSearchValue,
  getLocationLabel,
  getLocationMeta,
  getLocationSuggestions,
} from "../data/locations";
import { useLanguage } from "../i18n/LanguageContext";
import { fetchFlights } from "../lib/api";
import {
  formatCalendarDate,
  formatCurrencyValue,
  formatDateLabel,
  formatFlightDuration,
  formatStops,
  formatTimeLabel,
  getFriendlyApiError,
} from "../lib/formatters";

const SEARCH_DEBOUNCE_MS = 850;
const QUICK_DESTINATIONS = ["CDG", "IST", "LHR", "DXB", "ATH"];
const TRIP_TYPES = ["oneWay", "roundTrip", "multiCity"];
const RESULT_TAB_KEYS = ["recommended", "nonstop", "fastest", "earliest", "cheapest"];
const FALLBACK_TEXT = "\u2014";

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

function buildSearchParams(snapshot) {
  const params = new URLSearchParams();
  params.set("from", snapshot.from);
  params.set("fromLabel", snapshot.fromLabel);
  params.set("to", snapshot.to);
  params.set("toLabel", snapshot.toLabel);
  params.set("date", snapshot.date);
  params.set("human", snapshot.isHuman ? "1" : "0");
  params.set("auto", "1");
  return params;
}

function getSafeText(value, fallback = FALLBACK_TEXT) {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function getAirlineInitials(value) {
  const words = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "AT";
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function getFlightPrice(flight = {}, language) {
  if (flight.priceFormatted) {
    return flight.priceFormatted;
  }

  if (typeof flight.price === "number") {
    return formatCurrencyValue(flight.price, flight.currency, language);
  }

  return FALLBACK_TEXT;
}

function getFlightDurationLabel(flight = {}, language) {
  if (flight.duration && flight.duration !== "Unknown") {
    return flight.duration;
  }

  if (flight.departure && flight.arrival) {
    return formatFlightDuration(flight.duration, flight.departure, flight.arrival, language);
  }

  return FALLBACK_TEXT;
}

export default function FlightsPage() {
  const { language, t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [form, setForm] = useState({
    from: "",
    fromCode: "",
    to: "",
    toCode: "",
    date: "",
    isHuman: false,
  });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDebouncing, setIsDebouncing] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [lastSearch, setLastSearch] = useState(null);
  const [meta, setMeta] = useState(null);
  const [tripType, setTripType] = useState("oneWay");
  const [returnDate, setReturnDate] = useState("");
  const [activeResultTab, setActiveResultTab] = useState("recommended");
  const debounceRef = useRef(null);
  const lastAutoSearchRef = useRef("");

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
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

  const runSearch = useCallback(
    async (snapshot) => {
      setLoading(true);
      setError("");
      setHasSearched(true);
      setLastSearch({
        from: snapshot.fromLabel,
        to: snapshot.toLabel,
        date: snapshot.date,
      });

      try {
        const response = await fetchFlights({
          from: snapshot.from,
          to: snapshot.to,
          date: snapshot.date,
        });

        setResults(
          Array.isArray(response?.results)
            ? response.results
            : Array.isArray(response?.flights)
              ? response.flights
              : []
        );
        setMeta(response?.meta || null);
      } catch (requestError) {
        setResults([]);
        setMeta(null);
        setError(
          getFriendlyApiError(requestError, t("flights.errors.searchFailed"), {
            blockedMessage: t("common.tooManyRequests"),
            providerUnavailableMessage: t("common.providerUnavailable"),
          })
        );
      } finally {
        setLoading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    const fromParam = searchParams.get("from") || "";
    const toParam = searchParams.get("to") || "";
    const dateParam = searchParams.get("date") || "";
    const fromLocation = findLocation(fromParam);
    const toLocation = findLocation(toParam);
    const fromLabel =
      searchParams.get("fromLabel") ||
      getLocationLabel(fromLocation, language) ||
      fromParam;
    const toLabel =
      searchParams.get("toLabel") || getLocationLabel(toLocation, language) || toParam;
    const isHuman = searchParams.get("human") === "1";

    setForm((previousForm) => ({
      ...previousForm,
      from: fromLabel,
      fromCode: fromLocation?.code || "",
      to: toLabel,
      toCode: toLocation?.code || "",
      date: dateParam,
      isHuman: isHuman || previousForm.isHuman,
    }));

    if (!fromParam || !toParam || !dateParam || searchParams.get("auto") !== "1") {
      return;
    }

    const searchKey = `${fromParam}|${toParam}|${dateParam}|${fromLabel}|${toLabel}`;

    if (lastAutoSearchRef.current === searchKey) {
      return;
    }

    lastAutoSearchRef.current = searchKey;
    void runSearch({
      from: fromParam,
      fromLabel,
      to: toParam,
      toLabel,
      date: dateParam,
    });
  }, [language, runSearch, searchParams]);

  const handleSubmit = (event) => {
    event.preventDefault();

    const fromLocation = findLocation(form.fromCode || form.from);
    const toLocation = findLocation(form.toCode || form.to);
    const snapshot = {
      from: getFlightSearchValue(fromLocation, form.from),
      fromLabel: form.from.trim(),
      to: getFlightSearchValue(toLocation, form.to),
      toLabel: form.to.trim(),
      date: form.date.trim(),
      isHuman: form.isHuman,
    };

    if (!snapshot.fromLabel || !snapshot.toLabel || !snapshot.date) {
      setError(t("flights.errors.required"));
      return;
    }

    if (!snapshot.isHuman) {
      setError(t("flights.errors.human"));
      return;
    }

    const nextParams = buildSearchParams(snapshot);

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    setIsDebouncing(true);
    setError("");
    debounceRef.current = window.setTimeout(() => {
      setIsDebouncing(false);

      if (searchParams.toString() === nextParams.toString()) {
        const searchKey = `${snapshot.from}|${snapshot.to}|${snapshot.date}|${snapshot.fromLabel}|${snapshot.toLabel}`;
        lastAutoSearchRef.current = searchKey;
        void runSearch(snapshot);
      } else {
        setSearchParams(nextParams);
      }

      debounceRef.current = null;
    }, SEARCH_DEBOUNCE_MS);
  };

  const handleSwapLocations = () => {
    setForm((previousForm) => ({
      ...previousForm,
      from: previousForm.to,
      fromCode: previousForm.toCode,
      to: previousForm.from,
      toCode: previousForm.fromCode,
    }));

    if (error) {
      setError("");
    }
  };

  const isBusy = loading || isDebouncing;
  const statusLabel = loading
    ? t("flights.searchingButton")
    : isDebouncing
      ? t("flights.preparingButton")
      : t("flights.searchButton");
  const heroContent = t("app.pages.flights");
  const flightsHeading = t("flights.heading");
  const showReturnDate = tripType === "roundTrip" || Boolean(returnDate);

  return (
    <PublicPageShell
      backgroundImage={backgroundTwo}
      eyebrow={heroContent.eyebrow}
      title={heroContent.title}
      description={t("flights.heroDescription")}
      highlights={Array.isArray(heroContent.highlights) ? heroContent.highlights : []}
      compactHero
    >
      <SEO {...PAGE_SEO.flights} />
      <section className="space-y-6">
        <div className="overflow-visible rounded-[2.25rem] border border-white/75 bg-white/95 shadow-[0_34px_100px_-58px_rgba(15,23,42,0.6)] backdrop-blur dark:border-white/10 dark:bg-transparent dark:shadow-[0_34px_100px_-58px_rgba(2,6,23,0.95)]">
          <div className="space-y-6 p-4 sm:p-5 lg:p-7">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#d83f45] dark:text-[#ff8c90]">
                {t("flights.sectionLabel")}
              </p>
              {flightsHeading ? (
                <h2 className="[font-family:var(--font-display)] mt-2 text-3xl font-semibold text-slate-950 dark:text-white">
                  {flightsHeading}
                </h2>
              ) : null}
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 dark:text-white">
                {t("flights.helperText")}
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <TripTypeOptions
                  tripType={tripType}
                  onChange={setTripType}
                  t={t}
                />

                <VisualField
                  label={t("flights.cabinLabel")}
                  value={t("flights.cabinEconomy")}
                  className="lg:min-w-[12rem]"
                />
              </div>

              <div className="flex flex-col gap-3 xl:flex-row xl:items-stretch">
                <FieldCard className="xl:min-w-0 xl:flex-[1.16]">
                  <AutocompleteInput
                    label={t("common.from")}
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
                    placeholder={t("flights.placeholders.from")}
                    noSuggestionsText={t("common.noSuggestions")}
                  />
                </FieldCard>

                <button
                  type="button"
                  onClick={handleSwapLocations}
                  aria-label={t("flights.swapRoute")}
                  title={t("flights.swapRoute")}
                  className="flex h-12 w-12 shrink-0 items-center justify-center self-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-[0_16px_34px_-26px_rgba(15,23,42,0.8)] transition hover:-translate-y-0.5 hover:border-[#e64d53]/45 hover:text-[#d83f45] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-[#ff8c90]/45 dark:hover:text-[#ffb4b7] xl:h-[4.6rem] xl:w-[4.6rem]"
                >
                  <SwapIcon />
                </button>

                <FieldCard className="xl:min-w-0 xl:flex-[1.16]">
                  <AutocompleteInput
                    label={t("common.to")}
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
                    placeholder={t("flights.placeholders.to")}
                    noSuggestionsText={t("common.noSuggestions")}
                  />
                </FieldCard>

                <FieldCard className="xl:min-w-[10rem] xl:flex-[0.78]">
                  <DateField
                    label={t("flights.departureLabel")}
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
                  />
                </FieldCard>

                {showReturnDate ? (
                  <FieldCard className="xl:min-w-[10rem] xl:flex-[0.78]">
                    <DateField
                      label={t("flights.returnLabel")}
                      name="returnDate"
                      value={returnDate}
                      onChange={(event) => setReturnDate(event.target.value)}
                    />
                  </FieldCard>
                ) : null}

                <VisualField
                  label={t("flights.travelersLabel")}
                  value={t("flights.defaultTravelers")}
                  className="xl:min-w-[10rem] xl:flex-[0.78]"
                />

                <button
                  type="submit"
                  disabled={isBusy}
                  aria-label={statusLabel}
                  className="group flex h-14 w-full shrink-0 items-center justify-center rounded-[1.25rem] bg-[#e64d53] px-5 text-sm font-semibold text-white shadow-[0_22px_44px_-26px_rgba(216,63,69,0.9)] transition hover:-translate-y-0.5 hover:bg-[#d83f45] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700 disabled:shadow-none dark:disabled:bg-slate-700 dark:disabled:text-slate-300 xl:h-[4.6rem] xl:w-[4.6rem] xl:rounded-full xl:px-0"
                >
                  <SearchIcon />
                  <span className="ml-2 xl:sr-only">{statusLabel}</span>
                </button>
              </div>

              <div className="flex flex-col gap-4 rounded-[1.75rem] bg-slate-50 p-4 md:flex-row md:items-center md:justify-between dark:bg-slate-900/80">
                <label className="flex items-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-200">
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
                    className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  {t("flights.humanCheck")}
                </label>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-600 dark:text-slate-400">
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
                        className="rounded-full bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-200 dark:hover:bg-emerald-500/20"
                      >
                        {getLocationLabel(location, language)}
                      </button>
                    );
                  })}
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

        {(lastSearch || meta?.cached) && !loading ? (
          <div className="flex flex-col gap-3 rounded-[1.9rem] border border-white/70 bg-white/88 px-5 py-4 shadow-[0_24px_80px_-56px_rgba(15,23,42,0.45)] md:flex-row md:items-center md:justify-between dark:border-white/10 dark:bg-slate-900/82 dark:shadow-[0_24px_80px_-56px_rgba(2,6,23,0.8)]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-600 dark:text-slate-400">
                {t("flights.recentSearch")}
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">
                {lastSearch ? `${lastSearch.from} -> ${lastSearch.to}` : t("flights.latestRouteFallback")}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {lastSearch?.date ? (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {formatCalendarDate(lastSearch.date, language)}
                </span>
              ) : null}
              {meta?.cached ? (
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
                  {t("common.servedFromCache")}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        {loading ? <LoadingSkeleton /> : null}

        {!loading && results.length > 0 ? (
          <section className="space-y-4">
            <div className="rounded-[2rem] border border-white/70 bg-white/92 p-5 shadow-[0_26px_86px_-58px_rgba(15,23,42,0.55)] dark:border-white/10 dark:bg-slate-950/86 dark:shadow-[0_26px_86px_-58px_rgba(2,6,23,0.9)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                    {t("flights.resultsLabel")}
                  </p>
                  <h2 className="[font-family:var(--font-display)] mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
                    {t("flights.resultsHeading")}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {t("flights.resultsNote")}
                  </p>
                </div>
                <span className="inline-flex w-fit rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {results.length}
                </span>
              </div>

              <ResultTabs
                activeTab={activeResultTab}
                onChange={setActiveResultTab}
                t={t}
              />
            </div>

            <div className="grid gap-4">
              {results.map((flight, index) => (
                <FlightResultCard
                  key={`${flight.flightNumber || flight.airline || "flight"}-${index}`}
                  flight={flight}
                  index={index}
                  lastSearch={lastSearch}
                  language={language}
                  t={t}
                />
              ))}
            </div>
          </section>
        ) : null}

        {!loading && !error && hasSearched && results.length === 0 ? (
          <EmptyState
            title={t("flights.empty.noResultsTitle")}
            message={t("flights.empty.noResultsMessage")}
          />
        ) : null}

      </section>
    </PublicPageShell>
  );
}

function TripTypeOptions({ tripType, onChange, t }) {
  return (
    <div
      role="radiogroup"
      aria-label={t("flights.tripTypeLabel")}
      className="inline-flex w-full flex-wrap gap-1 rounded-full bg-slate-100 p-1 dark:bg-slate-900 sm:w-auto"
    >
      {TRIP_TYPES.map((type) => {
        const isSelected = tripType === type;

        return (
          <button
            key={type}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(type)}
            className={`min-h-10 flex-1 rounded-full px-4 py-2 text-sm font-semibold transition sm:flex-none ${
              isSelected
                ? "bg-white text-slate-950 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.72)] dark:bg-slate-800 dark:text-white"
                : "text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
            }`}
          >
            {t(`flights.tripTypes.${type}`)}
          </button>
        );
      })}
    </div>
  );
}

function FieldCard({ children, className = "" }) {
  return (
    <div
      className={`min-h-[4.6rem] rounded-[1.35rem] border border-slate-200 bg-white px-4 py-3 shadow-[0_18px_46px_-40px_rgba(15,23,42,0.9)] transition focus-within:border-[#e64d53]/55 dark:border-slate-800 dark:bg-slate-900/90 ${className}`}
    >
      {children}
    </div>
  );
}

function DateField({ label, name, value, onChange }) {
  return (
    <label className="block text-left">
      <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-600 dark:text-slate-400">
        {label}
      </span>
      <input
        type="date"
        name={name}
        value={value}
        onChange={onChange}
        className="mt-2 w-full bg-transparent text-sm font-semibold text-slate-950 outline-none dark:text-white"
      />
    </label>
  );
}

function VisualField({ label, value, className = "" }) {
  return (
    <div
      className={`min-h-[4.6rem] rounded-[1.35rem] border border-slate-200 bg-white px-4 py-3 text-left shadow-[0_18px_46px_-40px_rgba(15,23,42,0.9)] dark:border-slate-800 dark:bg-slate-900/90 ${className}`}
    >
      <span className="block text-xs font-semibold uppercase tracking-[0.24em] text-slate-600 dark:text-slate-400">
        {label}
      </span>
      <span className="mt-2 flex min-w-0 items-center justify-between gap-3 text-sm font-semibold text-slate-950 dark:text-white">
        <span className="min-w-0 truncate">{value}</span>
        <span className="h-2 w-2 rotate-45 border-b border-r border-slate-400 dark:border-slate-500" />
      </span>
    </div>
  );
}

function ResultTabs({ activeTab, onChange, t }) {
  return (
    <div
      role="tablist"
      aria-label={t("flights.resultCategoriesLabel")}
      className="mt-5 flex gap-2 overflow-x-auto pb-1"
    >
      {RESULT_TAB_KEYS.map((tab) => {
        const isSelected = activeTab === tab;

        return (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onChange(tab)}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
              isSelected
                ? "border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white"
            }`}
          >
            {t(`flights.resultTabs.${tab}`)}
          </button>
        );
      })}
    </div>
  );
}

function FlightResultCard({ flight = {}, index, lastSearch, language, t }) {
  const airline = getSafeText(flight.airline, t("flights.airlineFallback"));
  const departureTime = flight.departure
    ? formatTimeLabel(flight.departure, language)
    : FALLBACK_TEXT;
  const arrivalTime = flight.arrival
    ? formatTimeLabel(flight.arrival, language)
    : FALLBACK_TEXT;
  const departureDate = flight.departure
    ? formatDateLabel(flight.departure, language)
    : FALLBACK_TEXT;
  const arrivalDate = flight.arrival
    ? formatDateLabel(flight.arrival, language)
    : FALLBACK_TEXT;
  const duration = getFlightDurationLabel(flight, language);
  const price = getFlightPrice(flight, language);
  const stops = formatStops(flight.stops, language);
  const flightNumber = getSafeText(flight.flightNumber);
  const originCode = getSafeText(flight.originCode || lastSearch?.from);
  const destinationCode = getSafeText(flight.destinationCode || lastSearch?.to);
  const routeLabel = `${originCode} - ${destinationCode}`;

  return (
    <article className="group overflow-hidden rounded-[2rem] border border-white/75 bg-white/95 p-4 shadow-[0_30px_90px_-60px_rgba(15,23,42,0.62)] transition hover:-translate-y-0.5 hover:shadow-[0_34px_96px_-58px_rgba(15,23,42,0.7)] dark:border-white/10 dark:bg-slate-950/88 dark:shadow-[0_30px_90px_-60px_rgba(2,6,23,0.92)] sm:p-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_13rem] lg:items-center">
        <div className="min-w-0 space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-bold text-white dark:bg-white dark:text-slate-950">
                {getAirlineInitials(airline)}
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-slate-950 dark:text-white">
                  {airline}
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {routeLabel}
                </p>
              </div>
            </div>

            <span className="inline-flex w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
              {stops}
            </span>
          </div>

          <div className="grid gap-4 rounded-[1.65rem] bg-slate-50 p-4 dark:bg-slate-900/82 sm:grid-cols-[minmax(0,1fr)_minmax(8rem,0.7fr)_minmax(0,1fr)] sm:items-center">
            <FlightTimeBlock
              align="left"
              code={originCode}
              time={departureTime}
              date={departureDate}
            />

            <div className="flex items-center gap-3 sm:flex-col sm:gap-2">
              <div className="h-px flex-1 bg-slate-300 dark:bg-slate-700 sm:w-full sm:flex-none" />
              <p className="shrink-0 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                {duration}
              </p>
              <div className="h-px flex-1 bg-slate-300 dark:bg-slate-700 sm:w-full sm:flex-none" />
            </div>

            <FlightTimeBlock
              align="right"
              code={destinationCode}
              time={arrivalTime}
              date={arrivalDate}
            />
          </div>

          <div className="grid gap-3 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-3">
            <FlightMeta label={t("common.flight")} value={flightNumber} />
            <FlightMeta label={t("common.duration")} value={duration} />
            <FlightMeta label={t("common.route")} value={routeLabel} />
          </div>
        </div>

        <div className="rounded-[1.65rem] border border-slate-100 bg-white p-4 text-left dark:border-slate-800 dark:bg-slate-900/88 lg:text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            {t("common.price")}
          </p>
          <p className="[font-family:var(--font-display)] mt-2 text-3xl font-semibold text-slate-950 dark:text-white">
            {price}
          </p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {getSafeText(flightNumber, `${t("common.flight")} ${index + 1}`)}
          </p>

          {flight.bookingUrl ? (
            <a
              href={flight.bookingUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              {t("flights.booking")}
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="mt-5 inline-flex w-full cursor-not-allowed items-center justify-center rounded-full bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            >
              {t("flights.detailsUnavailable")}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function FlightTimeBlock({ align, code, time, date }) {
  const alignment = align === "right" ? "text-left sm:text-right" : "text-left";

  return (
    <div className={alignment}>
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
        {code}
      </p>
      <p className="mt-1 text-3xl font-semibold text-slate-950 dark:text-white">
        {time}
      </p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{date}</p>
    </div>
  );
}

function FlightMeta({ label, value }) {
  return (
    <div>
      <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <span className="mt-1 block truncate font-semibold text-slate-800 dark:text-slate-100">
        {value}
      </span>
    </div>
  );
}

function SwapIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 7h11" />
      <path d="m15 3 4 4-4 4" />
      <path d="M17 17H6" />
      <path d="m9 13-4 4 4 4" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
