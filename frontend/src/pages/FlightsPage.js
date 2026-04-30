import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import FlightSearchPanel from "../components/FlightSearchPanel";
import LoadingSkeleton from "../components/LoadingSkeleton";
import PublicPageShell from "../components/PublicPageShell";
import SEO, { PAGE_SEO } from "../components/SEO";
import backgroundTwo from "../assets/background/background-2.webp";
import { useLanguage } from "../i18n/LanguageContext";
import { fetchFlights, submitFlightBookingRequest } from "../lib/api";
import {
  formatCalendarDate,
  formatCurrencyValue,
  formatDateLabel,
  formatDateTimeLabel,
  formatFlightDuration,
  formatStops,
  formatTimeLabel,
  getFriendlyApiError,
} from "../lib/formatters";

const RESULT_TAB_KEYS = ["recommended", "nonstop", "fastest", "earliest", "cheapest"];
const FALLBACK_TEXT = "\u2014";

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

function parseDurationToMinutes(value) {
  const source = String(value || "").trim().toLowerCase();

  if (!source || source === "unknown" || source === FALLBACK_TEXT) {
    return null;
  }

  const hoursMatch = source.match(/(\d+(?:\.\d+)?)\s*h/);
  const minutesMatch = source.match(/(\d+)\s*m/);
  const hours = hoursMatch ? Number.parseFloat(hoursMatch[1]) : 0;
  const minutes = minutesMatch ? Number.parseInt(minutesMatch[1], 10) : 0;

  if (!hoursMatch && !minutesMatch) {
    const numericValue = Number.parseInt(source, 10);
    return Number.isNaN(numericValue) ? null : numericValue;
  }

  return Math.round(hours * 60 + minutes);
}

function getFlightDurationMinutes(flight) {
  const parsedDuration = parseDurationToMinutes(flight?.duration);

  if (parsedDuration !== null) {
    return parsedDuration;
  }

  const departureTime = Date.parse(flight?.departure || "");
  const arrivalTime = Date.parse(flight?.arrival || "");

  if (Number.isNaN(departureTime) || Number.isNaN(arrivalTime)) {
    return null;
  }

  return Math.max(Math.round((arrivalTime - departureTime) / 60000), 0);
}

function getFlightPriceValue(flight) {
  return typeof flight?.price === "number" ? flight.price : null;
}

function getFlightDepartureTime(flight) {
  const timestamp = Date.parse(flight?.departure || "");
  return Number.isNaN(timestamp) ? null : timestamp;
}

function sortByAvailableValue(flights, getValue) {
  const withValues = flights
    .map((flight, index) => ({ flight, index, value: getValue(flight) }))
    .filter((entry) => typeof entry.value === "number");

  if (withValues.length === 0) {
    return flights;
  }

  return [...flights].sort((firstFlight, secondFlight) => {
    const firstValue = getValue(firstFlight);
    const secondValue = getValue(secondFlight);

    if (typeof firstValue !== "number" && typeof secondValue !== "number") {
      return 0;
    }

    if (typeof firstValue !== "number") {
      return 1;
    }

    if (typeof secondValue !== "number") {
      return -1;
    }

    return firstValue - secondValue;
  });
}

function getDisplayFlights(results, activeResultTab) {
  if (activeResultTab === "nonstop") {
    const hasStopData = results.some((flight) => typeof flight?.stops === "number");

    if (!hasStopData) {
      return results;
    }

    return results.filter((flight) => flight?.stops === 0);
  }

  if (activeResultTab === "fastest") {
    return sortByAvailableValue(results, getFlightDurationMinutes);
  }

  if (activeResultTab === "earliest") {
    return sortByAvailableValue(results, getFlightDepartureTime);
  }

  if (activeResultTab === "cheapest") {
    return sortByAvailableValue(results, getFlightPriceValue);
  }

  return results;
}

function formatCarrierLabel(carrier = {}) {
  if (typeof carrier === "string") {
    return carrier.trim();
  }

  const name = String(carrier.name || carrier.airline || "").trim();
  const code = String(carrier.code || carrier.airlineCode || "").trim();

  if (name && code && name !== code) {
    return `${name} (${code})`;
  }

  return name || code;
}

function getFlightCarriers(flight = {}) {
  const carriers = Array.isArray(flight.airlines) ? flight.airlines : [];
  const normalizedCarriers = carriers
    .map((carrier) => ({
      label: formatCarrierLabel(carrier),
      name: typeof carrier === "string" ? carrier : carrier?.name || carrier?.airline || "",
      code: typeof carrier === "string" ? "" : carrier?.code || carrier?.airlineCode || "",
      logoUrl:
        typeof carrier === "string"
          ? ""
          : carrier?.logoUrl || carrier?.airlineLogo || carrier?.logo || "",
    }))
    .filter((carrier) => carrier.label || carrier.logoUrl);

  if (normalizedCarriers.length === 0 && (flight.airline || flight.airlineLogo)) {
    normalizedCarriers.push({
      label: formatCarrierLabel({ name: flight.airline }),
      name: flight.airline || "",
      code: "",
      logoUrl: flight.airlineLogo || "",
    });
  }

  const seen = new Set();

  return normalizedCarriers.filter((carrier) => {
    const key = `${carrier.label}:${carrier.logoUrl}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function getFlightSegments(flight = {}) {
  return Array.isArray(flight.segments) ? flight.segments.filter(Boolean) : [];
}

function getAirportLabel(name, code) {
  const safeName = String(name || "").trim();
  const safeCode = String(code || "").trim();

  if (safeName && safeCode && !safeName.includes(`(${safeCode})`)) {
    return `${safeName} (${safeCode})`;
  }

  return safeName || safeCode || FALLBACK_TEXT;
}

function getRoutePath(flight = {}, lastSearch = null) {
  if (Array.isArray(flight.routePath) && flight.routePath.filter(Boolean).length > 1) {
    return flight.routePath.filter(Boolean);
  }

  const segments = getFlightSegments(flight);

  if (segments.length > 0) {
    return [
      segments[0]?.originCode || segments[0]?.originAirport,
      ...segments.map((segment) => segment.destinationCode || segment.destinationAirport),
    ].filter(Boolean);
  }

  return [
    flight.originCode || lastSearch?.from,
    flight.destinationCode || lastSearch?.to,
  ].filter(Boolean);
}

function getRoutePathLabel(flight = {}, lastSearch = null) {
  const routePath = getRoutePath(flight, lastSearch);

  if (routePath.length > 1) {
    return routePath.join(" -> ");
  }

  return [
    flight.originCode || lastSearch?.from,
    flight.destinationCode || lastSearch?.to,
  ]
    .filter(Boolean)
    .join(" -> ");
}

function getSegmentRouteLabel(segment = {}) {
  return `${getAirportLabel(segment.originAirport, segment.originCode)} -> ${getAirportLabel(
    segment.destinationAirport,
    segment.destinationCode
  )}`;
}

function getSegmentAirlineLabel(segment = {}, fallback = FALLBACK_TEXT) {
  return (
    formatCarrierLabel({
      name: segment.airline,
      code: segment.airlineCode,
    }) || fallback
  );
}

function getSegmentFlightNumber(segment = {}) {
  const value = String(segment.flightNumber || "").trim();
  return value && value !== "Unknown flight" ? value : FALLBACK_TEXT;
}

function getTravelerLabel(search, t) {
  const travelers = search?.travelers;

  if (!travelers) {
    return "";
  }

  return [
    travelers.adults ? `${travelers.adults} ${t("flights.travelers.adults")}` : "",
    travelers.children ? `${travelers.children} ${t("flights.travelers.children")}` : "",
    travelers.infants ? `${travelers.infants} ${t("flights.travelers.infants")}` : "",
  ]
    .filter(Boolean)
    .join(", ");
}

function buildSelectedFlightPayload(flight, lastSearch, language, t) {
  const segments = getFlightSegments(flight);
  const carriers = getFlightCarriers(flight);
  const formattedSegments = segments.map((segment) => ({
    originCode: segment.originCode || "",
    originAirport: segment.originAirport || "",
    destinationCode: segment.destinationCode || "",
    destinationAirport: segment.destinationAirport || "",
    airline: segment.airline || "",
    airlineCode: segment.airlineCode || "",
    flightNumber: getSegmentFlightNumber(segment),
    departure: segment.departure ? formatDateTimeLabel(segment.departure, language) : "",
    arrival: segment.arrival ? formatDateTimeLabel(segment.arrival, language) : "",
    duration: getSafeText(segment.duration),
    aircraft: segment.aircraft || "",
    layoverAfter: segment.layoverAfter || null,
  }));
  const travelerLabel = getTravelerLabel(lastSearch, t);

  return {
    route: getRoutePathLabel(flight, lastSearch),
    airlines: carriers.map((carrier) => carrier.label).filter(Boolean),
    airline: getSafeText(flight.airline, t("flights.airlineFallback")),
    flightNumber: getSafeText(flight.flightNumber),
    flightNumbers: formattedSegments
      .map((segment) => segment.flightNumber)
      .filter((flightNumber) => flightNumber && flightNumber !== FALLBACK_TEXT),
    departure: flight.departure ? formatDateTimeLabel(flight.departure, language) : "",
    arrival: flight.arrival ? formatDateTimeLabel(flight.arrival, language) : "",
    duration: getFlightDurationLabel(flight, language),
    stopsLabel: formatStops(flight.stops, language),
    price: getFlightPrice(flight, language),
    cabin: lastSearch?.cabin ? t(`flights.cabinClasses.${lastSearch.cabin}`) : "",
    travelers: travelerLabel,
    segments: formattedSegments,
    layovers: formattedSegments
      .map((segment) => segment.layoverAfter)
      .filter(Boolean),
  };
}

export default function FlightsPage() {
  const { language, t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [lastSearch, setLastSearch] = useState(null);
  const [meta, setMeta] = useState(null);
  const [activeResultTab, setActiveResultTab] = useState("recommended");
  const [bookingFlight, setBookingFlight] = useState(null);
  const [bookingForm, setBookingForm] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerMessage: "",
  });
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [isBookingSuccessOpen, setIsBookingSuccessOpen] = useState(false);

  const runSearch = useCallback(
    async (snapshot) => {
      setLoading(true);
      setError("");
      setHasSearched(true);
      setLastSearch({
        from: snapshot.fromLabel,
        to: snapshot.toLabel,
        date: snapshot.date,
        returnDate: snapshot.returnDate,
        tripType: snapshot.tripType,
        cabin: snapshot.cabin,
        travelers: snapshot.travelers,
      });

      try {
        const requestParams = {
          from: snapshot.from,
          to: snapshot.to,
          date: snapshot.date,
          tripType: snapshot.tripType,
          cabin: snapshot.cabin,
          adults: snapshot.travelers.adults,
          children: snapshot.travelers.children,
          infants: snapshot.travelers.infants,
        };

        if (snapshot.tripType === "roundTrip" && snapshot.returnDate) {
          requestParams.returnDate = snapshot.returnDate;
        }

        const response = await fetchFlights(requestParams);

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

  const handleFlightSearch = useCallback(
    (snapshot, nextParams, options = {}) => {
      setError("");

      if (options.auto || searchParams.toString() === nextParams.toString()) {
        void runSearch(snapshot);
        return;
      }

      setSearchParams(nextParams);
    },
    [runSearch, searchParams, setSearchParams]
  );

  const openBookingModal = (flight) => {
    setBookingFlight(flight);
    setBookingError("");
  };

  const closeBookingModal = useCallback(() => {
    setBookingFlight(null);
    setBookingError("");
  }, []);

  const closeBookingSuccessModal = useCallback(() => {
    setIsBookingSuccessOpen(false);
  }, []);

  const handleBookingFieldChange = (event) => {
    const { name, value } = event.target;

    setBookingForm((previousForm) => ({
      ...previousForm,
      [name]: value,
    }));

    if (bookingError) {
      setBookingError("");
    }
  };

  const handleBookingSubmit = async (event) => {
    event.preventDefault();

    if (!bookingFlight) {
      return;
    }

    const trimmedForm = {
      customerName: bookingForm.customerName.trim(),
      customerEmail: bookingForm.customerEmail.trim(),
      customerPhone: bookingForm.customerPhone.trim(),
      customerMessage: bookingForm.customerMessage.trim(),
    };

    if (
      !trimmedForm.customerName ||
      !trimmedForm.customerEmail ||
      !trimmedForm.customerPhone
    ) {
      setBookingError(t("flights.bookingRequest.errors.required"));
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedForm.customerEmail)) {
      setBookingError(t("flights.bookingRequest.errors.email"));
      return;
    }

    setBookingSubmitting(true);
    setBookingError("");

    try {
      await submitFlightBookingRequest({
        ...trimmedForm,
        selectedFlight: buildSelectedFlightPayload(bookingFlight, lastSearch, language, t),
        language,
      });

      setBookingFlight(null);
      setIsBookingSuccessOpen(true);
      setBookingForm({
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        customerMessage: "",
      });
    } catch (requestError) {
      const apiCode = requestError.response?.data?.code;
      setBookingError(
        apiCode === "EMAIL_NOT_CONFIGURED"
          ? t("flights.bookingRequest.errors.emailNotConfigured")
          : getFriendlyApiError(
              requestError,
              t("flights.bookingRequest.errors.sendFailed")
            )
      );
    } finally {
      setBookingSubmitting(false);
    }
  };

  const heroContent = t("app.pages.flights");
  const displayedResults = useMemo(
    () => getDisplayFlights(results, activeResultTab),
    [results, activeResultTab]
  );

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
        <FlightSearchPanel
          searchParams={searchParams}
          loading={loading}
          externalError={error}
          onSearch={handleFlightSearch}
          onFormInteraction={() => setError("")}
        />

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
                  {displayedResults.length}
                </span>
              </div>

              <ResultTabs
                activeTab={activeResultTab}
                onChange={setActiveResultTab}
                t={t}
              />
            </div>

            <div className="grid gap-4">
              {displayedResults.length > 0 ? (
                displayedResults.map((flight, index) => (
                <FlightResultCard
                  key={`${flight.flightNumber || flight.airline || "flight"}-${index}`}
                  flight={flight}
                  index={index}
                  lastSearch={lastSearch}
                  language={language}
                  t={t}
                  onBookingRequest={openBookingModal}
                />
                ))
              ) : (
                <div className="rounded-[2rem] border border-white/70 bg-white/90 p-6 text-sm font-medium text-slate-600 shadow-[0_24px_80px_-58px_rgba(15,23,42,0.5)] dark:border-white/10 dark:bg-transparent dark:text-slate-300 dark:text-white">
                  {t("flights.noCategoryResults")}
                </div>
              )}
            </div>
          </section>
        ) : null}

        {!loading && !error && hasSearched && results.length === 0 ? (
          <EmptyState
            title={t("flights.empty.noResultsTitle")}
            message={t("flights.empty.noResultsMessage")}
          />
        ) : null}

        {bookingFlight ? (
          <BookingRequestModal
            flight={bookingFlight}
            form={bookingForm}
            error={bookingError}
            isSubmitting={bookingSubmitting}
            lastSearch={lastSearch}
            language={language}
            t={t}
            onChange={handleBookingFieldChange}
            onClose={closeBookingModal}
            onSubmit={handleBookingSubmit}
          />
        ) : null}

        {isBookingSuccessOpen ? (
          <BookingSuccessModal t={t} onClose={closeBookingSuccessModal} />
        ) : null}

      </section>
    </PublicPageShell>
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

function getFlightDetailItems(flight, t) {
  const airports = Array.isArray(flight.airports)
    ? flight.airports.filter(Boolean).join(" - ")
    : "";
  const providerNotes = /score|provider|internal/i.test(flight.providerNotes || "")
    ? ""
    : flight.providerNotes;

  return [
    { label: t("common.flight"), value: flight.flightNumber },
    { label: t("flights.details.aircraft"), value: flight.aircraft },
    { label: t("flights.details.baggage"), value: flight.baggage },
    {
      label: t("flights.details.airports"),
      value:
        airports ||
        [flight.originAirport, flight.destinationAirport].filter(Boolean).join(" - "),
    },
    { label: t("flights.details.providerNotes"), value: providerNotes },
  ].filter((item) => String(item.value || "").trim());
}

function FlightResultCard({
  flight = {},
  index,
  lastSearch,
  language,
  t,
  onBookingRequest,
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const carriers = getFlightCarriers(flight);
  const segments = getFlightSegments(flight);
  const airline = getSafeText(
    carriers[0]?.label || flight.airline,
    t("flights.airlineFallback")
  );
  const airlineNames = carriers.map((carrier) => carrier.label).filter(Boolean);
  const operatorLabel =
    airlineNames.length > 1
      ? t("flights.multipleAirlines")
      : `${t("flights.operatedBy")}: ${airlineNames[0] || airline}`;
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
  const routeLabel = getRoutePathLabel(flight, lastSearch) || `${originCode} -> ${destinationCode}`;
  const detailItems = getFlightDetailItems(flight, t);

  return (
    <article className="group overflow-hidden rounded-[2rem] border border-white/75 bg-white/95 p-4 shadow-[0_30px_90px_-60px_rgba(15,23,42,0.62)] transition hover:-translate-y-0.5 hover:shadow-[0_34px_96px_-58px_rgba(15,23,42,0.7)] dark:border-white/10 dark:bg-transparent dark:shadow-[0_30px_90px_-60px_rgba(2,6,23,0.92)] sm:p-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_13rem] lg:items-center">
        <div className="min-w-0 space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <AirlineLogoStack carriers={carriers} fallbackLabel={airline} />
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-slate-950 dark:text-white">
                  {airline}
                </h3>
                <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
                  {routeLabel}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {operatorLabel}
                </p>
                {airlineNames.length > 1 ? (
                  <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                    {airlineNames.join(", ")}
                  </p>
                ) : null}
              </div>
            </div>

            <span className="inline-flex w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
              {stops}
            </span>
          </div>

          <div className="grid gap-4 rounded-[1.65rem] bg-slate-50 p-4 dark:bg-transparent sm:grid-cols-[minmax(0,1fr)_minmax(8rem,0.7fr)_minmax(0,1fr)] sm:items-center">
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

          {segments.length > 1 ? (
            <div className="rounded-[1.25rem] border border-slate-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-200">
              <span className="mr-2 text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                {t("common.route")}
              </span>
              <span className="break-words">{routeLabel}</span>
            </div>
          ) : null}

          <div className="grid gap-3 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-3">
            <FlightMeta label={t("common.flight")} value={flightNumber} />
            <FlightMeta label={t("common.duration")} value={duration} />
            <FlightMeta label={t("common.route")} value={routeLabel} wrap />
          </div>
        </div>

        <div className="rounded-[1.65rem] border border-slate-100 bg-white p-4 text-left dark:border-slate-800 dark:bg-transparent lg:text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            {t("common.price")}
          </p>
          <p className="[font-family:var(--font-display)] mt-2 text-3xl font-semibold text-slate-950 dark:text-white">
            {price}
          </p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {getSafeText(flightNumber, `${t("common.flight")} ${index + 1}`)}
          </p>

          <div className="mt-5 space-y-2">
            <button
              type="button"
              onClick={() => onBookingRequest?.(flight)}
              className="inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              {t("flights.contactToBook")}
            </button>

            <button
              type="button"
              onClick={() => setDetailsOpen((currentValue) => !currentValue)}
              className="inline-flex w-full items-center justify-center rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:text-white"
            >
              {detailsOpen ? t("flights.hideDetails") : t("flights.showDetails")}
            </button>
          </div>
        </div>
      </div>

      {detailsOpen ? (
        <div className="mt-5 rounded-[1.65rem] bg-slate-50 p-4 dark:bg-transparent">
          {segments.length > 0 ? (
            <>
              <FlightSegmentBreakdown
                flight={flight}
                segments={segments}
                lastSearch={lastSearch}
                language={language}
                t={t}
              />
              {detailItems.length > 0 ? (
                <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4 dark:border-slate-800 sm:grid-cols-2 lg:grid-cols-3">
                  {detailItems.map((item) => (
                    <FlightMeta
                      key={`${item.label}-${item.value}`}
                      label={item.label}
                      value={item.value}
                      wrap
                    />
                  ))}
                </div>
              ) : null}
            </>
          ) : detailItems.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {detailItems.map((item) => (
                <FlightMeta
                  key={`${item.label}-${item.value}`}
                  label={item.label}
                  value={item.value}
                  wrap
                />
              ))}
            </div>
          ) : (
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              {t("flights.detailsUnavailable")}
            </p>
          )}
        </div>
      ) : null}
    </article>
  );
}

function AirlineLogoStack({ carriers = [], fallbackLabel }) {
  const visibleCarriers =
    carriers.length > 0
      ? carriers.slice(0, 3)
      : [{ label: fallbackLabel, logoUrl: "" }];

  return (
    <div className="flex h-12 min-w-12 shrink-0 items-center">
      {visibleCarriers.map((carrier, index) => (
        <AirlineAvatar
          key={`${carrier.label || fallbackLabel}-${index}`}
          carrier={carrier}
          fallbackLabel={carrier.label || fallbackLabel}
          className={index > 0 ? "-ml-3" : ""}
        />
      ))}
      {carriers.length > 3 ? (
        <span className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-xs font-bold text-slate-700 dark:border-slate-950 dark:bg-slate-800 dark:text-slate-100">
          +{carriers.length - 3}
        </span>
      ) : null}
    </div>
  );
}

function AirlineAvatar({ carrier = {}, fallbackLabel, className = "" }) {
  const [imageFailed, setImageFailed] = useState(false);
  const logoUrl = String(carrier.logoUrl || "").trim();

  if (logoUrl && !imageFailed) {
    return (
      <img
        src={logoUrl}
        alt={carrier.label || fallbackLabel}
        onError={() => setImageFailed(true)}
        className={`h-12 w-12 rounded-2xl border-2 border-white bg-white object-contain p-1 shadow-sm dark:border-slate-950 dark:bg-slate-900 ${className}`}
      />
    );
  }
}

function FlightSegmentBreakdown({ flight, segments, lastSearch, language, t }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
          {t("flights.flightDetails")}
        </p>
        <p className="mt-2 break-words text-lg font-semibold text-slate-950 dark:text-white">
          {getRoutePathLabel(flight, lastSearch)}
        </p>
      </div>

      <div className="space-y-3">
        {segments.map((segment, index) => {
          const layover = segment.layoverAfter || {};
          const segmentAirline = getSegmentAirlineLabel(
            segment,
            t("flights.airlineFallback")
          );
          const operatingAirline = formatCarrierLabel({
            name: segment.operatingAirline,
            code: segment.operatingAirlineCode,
          });
          const showOperatingAirline =
            operatingAirline && operatingAirline !== segmentAirline;

          return (
            <div
              key={`${segment.flightNumber || "segment"}-${index}`}
              className="rounded-[1.35rem] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/70"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#d83f45] dark:text-[#ff8c90]">
                    {t("flights.segment")} {index + 1}
                  </p>
                  <h4 className="mt-2 text-base font-semibold text-slate-950 dark:text-white">
                    {getSegmentRouteLabel(segment)}
                  </h4>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {getSegmentFlightNumber(segment)}
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <FlightMeta
                  label={t("flights.airlineLabel")}
                  value={segmentAirline}
                  wrap
                />
                <FlightMeta
                  label={t("flights.departureLabel")}
                  value={
                    segment.departure
                      ? formatDateTimeLabel(segment.departure, language)
                      : FALLBACK_TEXT
                  }
                  wrap
                />
                <FlightMeta
                  label={t("flights.arrivalLabel")}
                  value={
                    segment.arrival
                      ? formatDateTimeLabel(segment.arrival, language)
                      : FALLBACK_TEXT
                  }
                  wrap
                />
                <FlightMeta
                  label={t("common.duration")}
                  value={getSafeText(segment.duration)}
                  wrap
                />
              </div>

              {showOperatingAirline ? (
                <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">
                  {t("flights.operatedBy")}: {operatingAirline}
                </p>
              ) : null}

              {layover.airport || layover.duration ? (
                <div className="mt-4 rounded-[1.1rem] bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
                  <span className="font-semibold">{t("flights.layover")}:</span>{" "}
                  {getSafeText(layover.airport)}
                  {layover.duration ? (
                    <span className="ml-2">
                      {t("flights.layoverDuration")}: {layover.duration}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BookingRequestModal({
  flight,
  form,
  error,
  isSubmitting,
  lastSearch,
  language,
  t,
  onChange,
  onClose,
  onSubmit,
}) {
  const selectedFlight = buildSelectedFlightPayload(flight, lastSearch, language, t);
  const summaryRows = [
    { label: t("common.route"), value: selectedFlight.route },
    {
      label: t("flights.airlineLabel"),
      value: selectedFlight.airlines.join(", ") || selectedFlight.airline,
    },
    {
      label: t("common.flight"),
      value:
        selectedFlight.flightNumbers.join(", ") || selectedFlight.flightNumber,
    },
    { label: t("flights.departureLabel"), value: selectedFlight.departure },
    { label: t("flights.arrivalLabel"), value: selectedFlight.arrival },
    { label: t("common.duration"), value: selectedFlight.duration },
    { label: t("flights.stopsLayovers"), value: selectedFlight.stopsLabel },
    { label: t("common.price"), value: selectedFlight.price },
    {
      label: t("flights.cabinTravelers"),
      value: [selectedFlight.cabin, selectedFlight.travelers]
        .filter(Boolean)
        .join(", "),
    },
  ].filter((item) => String(item.value || "").trim());

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    const originalOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-request-title"
      className="fixed inset-0 z-50 flex items-end justify-center px-4 py-4 sm:items-center"
    >
      <button
        type="button"
        aria-label={t("common.close")}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
      />

      <div className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] border border-white/70 bg-white p-5 shadow-[0_34px_120px_-48px_rgba(15,23,42,0.85)] dark:border-white/10 dark:bg-slate-950 dark:shadow-[0_34px_120px_-48px_rgba(2,6,23,0.95)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#d83f45] dark:text-[#ff8c90]">
              {t("flights.bookingRequest.eyebrow")}
            </p>
            <h2
              id="booking-request-title"
              className="[font-family:var(--font-display)] mt-2 text-2xl font-semibold text-slate-950 dark:text-white"
            >
              {t("flights.bookingRequest.title")}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-lg font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-950 dark:border-slate-800 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:text-white"
          >
            x
          </button>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="rounded-[1.5rem] bg-slate-50 p-4 dark:bg-transparent">
            <h3 className="text-sm font-semibold text-slate-950 dark:text-white">
              {t("flights.bookingRequest.selectedFlight")}
            </h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {summaryRows.map((item) => (
                <FlightMeta
                  key={`${item.label}-${item.value}`}
                  label={item.label}
                  value={item.value}
                  wrap
                />
              ))}
            </div>

            {selectedFlight.segments.length > 0 ? (
              <div className="mt-4 space-y-2 border-t border-slate-200 pt-4 dark:border-slate-800">
                {selectedFlight.segments.map((segment, index) => (
                  <div
                    key={`${segment.flightNumber || "modal-segment"}-${index}`}
                    className="rounded-[1rem] border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-950/70"
                  >
                    <p className="font-semibold text-slate-950 dark:text-white">
                      {t("flights.segment")} {index + 1}:{" "}
                      {getSegmentRouteLabel(segment)}
                    </p>
                    <p className="mt-1 text-slate-600 dark:text-slate-300">
                      {[segment.airline, segment.flightNumber, segment.duration]
                        .filter(Boolean)
                        .join(" | ")}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <form className="space-y-4" onSubmit={onSubmit} noValidate>
            <BookingTextField
              label={t("flights.bookingRequest.name")}
              name="customerName"
              value={form.customerName}
              onChange={onChange}
              required
            />
            <BookingTextField
              label={t("flights.bookingRequest.email")}
              name="customerEmail"
              type="email"
              value={form.customerEmail}
              onChange={onChange}
              required
            />
            <BookingTextField
              label={t("flights.bookingRequest.phone")}
              name="customerPhone"
              type="tel"
              value={form.customerPhone}
              onChange={onChange}
              required
            />
            <label className="block">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t("flights.bookingRequest.message")}
              </span>
              <textarea
                name="customerMessage"
                value={form.customerMessage}
                onChange={onChange}
                rows={4}
                className="mt-2 w-full rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[#e64d53]/60 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
            </label>

            <p className="rounded-[1.1rem] bg-amber-50 px-4 py-3 text-sm font-medium leading-6 text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
              {t("flights.bookingRequest.priceWarning")}
            </p>

            {error ? (
              <p className="rounded-[1.1rem] bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center rounded-full bg-[#e64d53] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_42px_-26px_rgba(216,63,69,0.9)] transition hover:bg-[#d83f45] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700 disabled:shadow-none"
            >
              {isSubmitting
                ? t("flights.bookingRequest.sending")
                : t("flights.bookingRequest.send")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function BookingSuccessModal({ t, onClose }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    const originalOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-success-title"
      className="fixed inset-0 z-50 flex items-end justify-center px-4 py-4 sm:items-center"
    >
      <button
        type="button"
        aria-label={t("common.close")}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
      />

      <div className="relative w-full max-w-lg rounded-[2rem] border border-white/70 bg-white p-6 text-center shadow-[0_34px_120px_-48px_rgba(15,23,42,0.85)] dark:border-white/10 dark:bg-slate-950 sm:p-7">
        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-lg font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-950 dark:border-slate-800 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:text-white"
        >
          x
        </button>

        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
          <svg
            aria-hidden="true"
            className="h-7 w-7"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m5 12 4 4L19 6" />
          </svg>
        </div>
        <h2
          id="booking-success-title"
          className="[font-family:var(--font-display)] mt-5 text-2xl font-semibold text-slate-950 dark:text-white"
        >
          {t("flights.bookingRequest.successTitle")}
        </h2>
        <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
          {t("flights.bookingRequest.success")}
        </p>
        <p className="mt-4 rounded-[1.1rem] bg-amber-50 px-4 py-3 text-sm font-medium leading-6 text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
          {t("flights.bookingRequest.priceWarning")}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-[#e64d53] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_42px_-26px_rgba(216,63,69,0.9)] transition hover:bg-[#d83f45]"
        >
          {t("flights.bookingRequest.successAction")}
        </button>
      </div>
    </div>
  );
}

function BookingTextField({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
      </span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        className="mt-2 w-full rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[#e64d53]/60 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
      />
    </label>
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

function FlightMeta({ label, value, wrap = false }) {
  return (
    <div>
      <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <span
        className={`mt-1 block font-semibold text-slate-800 dark:text-slate-100 ${
          wrap ? "break-words" : "truncate"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
