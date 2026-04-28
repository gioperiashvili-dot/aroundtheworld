import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AutocompleteInput from "../components/AutocompleteInput";
import EmptyState from "../components/EmptyState";
import LoadingSkeleton from "../components/LoadingSkeleton";
import PublicPageShell from "../components/PublicPageShell";
import backgroundTwo from "../assets/background/background-2.jpg";
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

  const isBusy = loading || isDebouncing;
  const statusLabel = loading
    ? t("flights.searchingButton")
    : isDebouncing
      ? t("flights.preparingButton")
      : t("flights.searchButton");
  const heroContent = t("app.pages.flights");
  const flightsHeading = t("flights.heading");

  return (
    <PublicPageShell
      backgroundImage={backgroundTwo}
      eyebrow={heroContent.eyebrow}
      title={heroContent.title}
      description={t("flights.heroDescription")}
      highlights={Array.isArray(heroContent.highlights) ? heroContent.highlights : []}
      compactHero
    >
      <section className="space-y-6">
        <div className="overflow-visible rounded-[2rem] border border-white/70 bg-white/92 shadow-[0_30px_90px_-58px_rgba(15,23,42,0.55)] dark:border-white/10 dark:bg-slate-900/88 dark:shadow-[0_30px_90px_-58px_rgba(2,6,23,0.9)]">
          <div className="space-y-6 p-6 lg:p-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700 dark:text-emerald-300">
                {t("flights.sectionLabel")}
              </p>
              {flightsHeading ? (
                <h2 className="[font-family:var(--font-display)] mt-2 text-3xl font-semibold text-slate-950 dark:text-white">
                  {flightsHeading}
                </h2>
              ) : null}
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700 dark:text-slate-300">
                {t("flights.helperText")}
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid gap-4 xl:grid-cols-[1.12fr_1.12fr_0.92fr_auto]">
                <FieldCard>
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

                <FieldCard>
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

                <FieldCard>
                  <label className="block text-left">
                    <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-600 dark:text-slate-400">
                      {t("common.date")}
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
                </FieldCard>

                <div className="flex items-stretch">
                  <button
                    type="submit"
                    disabled={isBusy}
                    className="w-full rounded-[1.35rem] bg-slate-950 px-6 py-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700 dark:disabled:bg-slate-700 dark:disabled:text-slate-300"
                  >
                    {statusLabel}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-4 rounded-[1.75rem] bg-slate-50 p-4 md:flex-row md:items-center md:justify-between dark:bg-slate-800/70">
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
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-600 dark:text-slate-400">
                {t("flights.resultsLabel")}
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{results.length}</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {results.map((flight, index) => {
                const departureTime = formatTimeLabel(flight.departure, language);
                const arrivalTime = formatTimeLabel(flight.arrival, language);
                const departureDate = formatDateLabel(flight.departure, language);
                const arrivalDate = formatDateLabel(flight.arrival, language);
                const duration = formatFlightDuration(
                  flight.duration,
                  flight.departure,
                  flight.arrival,
                  language
                );
                const price =
                  flight.priceFormatted ||
                  formatCurrencyValue(flight.price, flight.currency, language);

                return (
                  <article
                    key={`${flight.flightNumber || flight.airline}-${index}`}
                    className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/92 shadow-[0_30px_90px_-58px_rgba(15,23,42,0.55)] dark:border-white/10 dark:bg-slate-900/88 dark:shadow-[0_30px_90px_-58px_rgba(2,6,23,0.9)]"
                  >
                    <div className="bg-[linear-gradient(145deg,_#ffffff,_#f3f5f9)] p-5 dark:bg-[linear-gradient(145deg,_#0f172a,_#111c32)]">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700 dark:text-emerald-300">
                            {flight.airline || t("flights.airlineFallback")}
                          </p>
                          <h3 className="mt-2 [font-family:var(--font-display)] text-3xl font-semibold text-slate-950 dark:text-white">
                            {price}
                          </h3>
                        </div>
                        <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
                          {formatStops(flight.stops, language)}
                        </span>
                      </div>

                      <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-[1.7rem] bg-slate-50 p-4 dark:bg-slate-800/70">
                        <div>
                          <p className="text-3xl font-semibold text-slate-950 dark:text-white">
                            {departureTime}
                          </p>
                          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                            {departureDate}
                          </p>
                        </div>

                        <div className="text-center">
                          <p className="text-sm font-semibold text-slate-600 dark:text-slate-200">
                            {duration}
                          </p>
                          <div className="mt-2 h-px w-16 bg-slate-300 dark:bg-slate-600" />
                        </div>

                        <div className="text-right">
                          <p className="text-3xl font-semibold text-slate-950 dark:text-white">
                            {arrivalTime}
                          </p>
                          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                            {arrivalDate}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 p-5">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[1.4rem] bg-slate-50 p-4 dark:bg-slate-800/80">
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-600 dark:text-slate-400">
                            {t("common.flight")}
                          </p>
                          <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">
                            {flight.flightNumber || t("common.unavailable")}
                          </p>
                        </div>

                        <div className="rounded-[1.4rem] bg-slate-50 p-4 dark:bg-slate-800/80">
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-600 dark:text-slate-400">
                            {t("common.route")}
                          </p>
                          <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">
                            {flight.originCode || lastSearch?.from} - {flight.destinationCode || lastSearch?.to}
                          </p>
                        </div>
                      </div>

                      {flight.bookingUrl ? (
                        <a
                          href={flight.bookingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          {t("flights.booking")}
                        </a>
                      ) : null}
                    </div>
                  </article>
                );
              })}
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

function FieldCard({ children }) {
  return (
    <div className="rounded-[1.35rem] border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900/90">
      {children}
    </div>
  );
}
