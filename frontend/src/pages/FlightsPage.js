import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import BookingSearchTabs from "../components/BookingSearchTabs";
import EmptyState from "../components/EmptyState";
import LoadingSkeleton from "../components/LoadingSkeleton";
import PublicPageShell from "../components/PublicPageShell";
import SEO, { PAGE_SEO } from "../components/SEO";
import backgroundTwo from "../assets/background/background-7.webp";
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
import { buildWebPageStructuredData } from "../lib/structuredData";

const SORT_OPTIONS = ["recommended", "cheapest", "fastest", "earliest"];
const ARRIVAL_TIME_FILTERS = ["morning", "afternoon", "evening", "night"];
const STOP_FILTERS = ["nonstop", "oneStop", "twoPlusStops"];
const FALLBACK_TEXT = "\u2014";

const DEFAULT_FLIGHT_FILTERS = {
  sortBy: "recommended",
  arrivalTimes: [],
  stops: [],
  airlines: [],
  minPrice: "",
  maxPrice: "",
};

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

function parseNumericValue(value) {
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

function getFlightPriceValue(flight) {
  return parseNumericValue(flight?.price ?? flight?.priceFormatted);
}

function getFlightDepartureTime(flight) {
  const timestamp = Date.parse(flight?.departure || "");
  return Number.isNaN(timestamp) ? null : timestamp;
}

function getFlightArrivalTime(flight) {
  const segments = getFlightSegments(flight);
  const lastSegment = segments[segments.length - 1];
  const timestamp = Date.parse(lastSegment?.arrival || flight?.arrival || "");
  return Number.isNaN(timestamp) ? null : timestamp;
}

function getFlightArrivalTimeKey(flight) {
  const arrivalTime = getFlightArrivalTime(flight);

  if (arrivalTime === null) {
    return null;
  }

  const hour = new Date(arrivalTime).getHours();

  if (hour >= 5 && hour < 12) {
    return "morning";
  }

  if (hour >= 12 && hour < 17) {
    return "afternoon";
  }

  if (hour >= 17 && hour < 22) {
    return "evening";
  }

  return "night";
}

function getFlightStopCount(flight) {
  if (typeof flight?.stops === "number") {
    return flight.stops;
  }

  const segments = getFlightSegments(flight);

  if (segments.length > 1) {
    return segments.length - 1;
  }

  return null;
}

function getFlightStopFilterKey(flight) {
  const stops = getFlightStopCount(flight);

  if (stops === null) {
    return null;
  }

  if (stops === 0) {
    return "nonstop";
  }

  if (stops === 1) {
    return "oneStop";
  }

  return "twoPlusStops";
}

function getFlightAirlineLabels(flight) {
  return getFlightCarriers(flight)
    .map((carrier) => carrier.label)
    .filter(Boolean);
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

function getSortedFlights(flights, sortBy) {
  if (sortBy === "fastest") {
    return sortByAvailableValue(flights, getFlightDurationMinutes);
  }

  if (sortBy === "earliest") {
    return sortByAvailableValue(flights, getFlightDepartureTime);
  }

  if (sortBy === "cheapest") {
    return sortByAvailableValue(flights, getFlightPriceValue);
  }

  return flights;
}

function getFilteredFlights(results, filters) {
  const hasArrivalFilter = filters.arrivalTimes.length > 0;
  const hasStopFilter = filters.stops.length > 0;
  const hasAirlineFilter = filters.airlines.length > 0;
  const minPrice = parseNumericValue(filters.minPrice);
  const maxPrice = parseNumericValue(filters.maxPrice);
  const hasPriceFilter = minPrice !== null || maxPrice !== null;

  const filteredFlights = results.filter((flight) => {
    if (hasArrivalFilter) {
      const arrivalKey = getFlightArrivalTimeKey(flight);

      if (!arrivalKey || !filters.arrivalTimes.includes(arrivalKey)) {
        return false;
      }
    }

    if (hasStopFilter) {
      const stopKey = getFlightStopFilterKey(flight);

      if (!stopKey || !filters.stops.includes(stopKey)) {
        return false;
      }
    }

    if (hasAirlineFilter) {
      const airlineLabels = getFlightAirlineLabels(flight);

      if (!airlineLabels.some((airline) => filters.airlines.includes(airline))) {
        return false;
      }
    }

    if (hasPriceFilter) {
      const price = getFlightPriceValue(flight);

      if (price === null) {
        return false;
      }

      if (minPrice !== null && price < minPrice) {
        return false;
      }

      if (maxPrice !== null && price > maxPrice) {
        return false;
      }
    }

    return true;
  });

  return getSortedFlights(filteredFlights, filters.sortBy);
}

function getFlightFilterOptions(results) {
  const airlineMap = new Map();
  let hasArrivalTimes = false;
  let hasStops = false;
  let hasPrices = false;

  results.forEach((flight) => {
    getFlightAirlineLabels(flight).forEach((airline) => {
      if (!airlineMap.has(airline)) {
        airlineMap.set(airline, airline);
      }
    });

    if (getFlightArrivalTimeKey(flight)) {
      hasArrivalTimes = true;
    }

    if (getFlightStopFilterKey(flight)) {
      hasStops = true;
    }

    if (getFlightPriceValue(flight) !== null) {
      hasPrices = true;
    }
  });

  return {
    airlines: Array.from(airlineMap.values()).sort((firstAirline, secondAirline) =>
      firstAirline.localeCompare(secondAirline)
    ),
    hasArrivalTimes,
    hasStops,
    hasPrices,
  };
}

function toggleFilterValue(values, value) {
  return values.includes(value)
    ? values.filter((currentValue) => currentValue !== value)
    : [...values, value];
}

function hasActiveFlightFilters(filters) {
  return (
    filters.sortBy !== DEFAULT_FLIGHT_FILTERS.sortBy ||
    filters.arrivalTimes.length > 0 ||
    filters.stops.length > 0 ||
    filters.airlines.length > 0 ||
    String(filters.minPrice || "").trim() ||
    String(filters.maxPrice || "").trim()
  );
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
  const [flightFilters, setFlightFilters] = useState(DEFAULT_FLIGHT_FILTERS);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
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
        currencyCode: snapshot.currencyCode,
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

        if (snapshot.currencyCode) {
          requestParams.currencyCode = snapshot.currencyCode;
        }

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
        setFlightFilters(DEFAULT_FLIGHT_FILTERS);
        setIsMobileFiltersOpen(false);
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
  const bookingTab =
    searchParams.get("tripType") === "roundTrip" || searchParams.get("returnDate")
      ? "roundTrip"
      : "oneWay";
  const displayedResults = useMemo(
    () => getFilteredFlights(results, flightFilters),
    [flightFilters, results]
  );
  const filterOptions = useMemo(() => getFlightFilterOptions(results), [results]);
  const webPageStructuredData = buildWebPageStructuredData(PAGE_SEO.flights);

  return (
    <PublicPageShell
      backgroundImage={backgroundTwo}
      eyebrow={heroContent.eyebrow}
      title={heroContent.title}
      description={t("flights.heroDescription")}
      highlights={Array.isArray(heroContent.highlights) ? heroContent.highlights : []}
      compactHero
    >
      <SEO {...PAGE_SEO.flights} structuredData={webPageStructuredData} />
      <section className="space-y-6">
        <BookingSearchTabs
          defaultTab={bookingTab}
          flightSearchParams={searchParams}
          flightLoading={loading}
          flightError={error}
          onFlightSearch={handleFlightSearch}
          onFlightFormInteraction={() => setError("")}
        />

        {(lastSearch || meta?.cached) && !loading ? (
          <div className="flex flex-col gap-3 rounded-[1rem] border border-white/10 bg-[#202020] px-5 py-4 text-white shadow-[0_24px_80px_-56px_rgba(0,0,0,0.9)] md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--aw-accent)]">
                {t("flights.recentSearch")}
              </p>
              <p className="mt-1 text-lg font-semibold text-white">
                {lastSearch ? `${lastSearch.from} -> ${lastSearch.to}` : t("flights.latestRouteFallback")}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {lastSearch?.date ? (
                <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-white/78">
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
            <div className="premium-results-toolbar rounded-[1rem] border border-white/10 bg-[#242424] p-5 text-white shadow-[0_26px_86px_-58px_rgba(0,0,0,0.92)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/56">
                    {t("flights.resultsLabel")}
                  </p>
                  <h2 className="[font-family:var(--font-display)] mt-2 text-2xl font-semibold text-white">
                    {t("flights.resultsHeading")}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-white/66">
                    {t("flights.resultsNote")}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex w-fit rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white">
                    {displayedResults.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsMobileFiltersOpen(true)}
                    className="inline-flex rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm font-semibold text-white/78 transition hover:border-[var(--aw-accent)] hover:text-white lg:hidden"
                  >
                    {t("flights.filters.open")}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
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
                  <div className="rounded-[1rem] border border-white/10 bg-[#242424] p-6 text-sm font-medium text-white/72 shadow-[0_24px_80px_-58px_rgba(0,0,0,0.9)]">
                    {t("flights.noCategoryResults")}
                  </div>
                )}
              </div>

              <aside className="hidden lg:block">
                <FlightFiltersPanel
                  filters={flightFilters}
                  options={filterOptions}
                  t={t}
                  onChange={setFlightFilters}
                />
              </aside>
            </div>

            {isMobileFiltersOpen ? (
              <FlightFiltersDrawer
                filters={flightFilters}
                options={filterOptions}
                t={t}
                onChange={setFlightFilters}
                onClose={() => setIsMobileFiltersOpen(false)}
              />
            ) : null}
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

function FlightFiltersDrawer({ filters, options, t, onChange, onClose }) {
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
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label={t("flights.filters.close")}
        onClick={onClose}
        className="absolute inset-0 bg-black/68 backdrop-blur-sm"
      />
      <div className="absolute bottom-0 left-0 right-0 max-h-[88vh] overflow-y-auto rounded-t-[1.2rem] border border-white/10 bg-[#171717] p-4 text-white shadow-[0_24px_90px_-34px_rgba(0,0,0,0.95)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="[font-family:var(--font-display)] text-xl font-semibold">
            {t("flights.filters.label")}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/12 text-white/70 transition hover:border-[var(--aw-accent)] hover:text-white"
            aria-label={t("flights.filters.close")}
          >
            x
          </button>
        </div>
        <FlightFiltersPanel
          filters={filters}
          options={options}
          t={t}
          onChange={onChange}
          compact
        />
      </div>
    </div>
  );
}

function FlightFiltersPanel({ filters, options, t, onChange, compact = false }) {
  const isActive = hasActiveFlightFilters(filters);

  const updateFilter = (patch) => {
    onChange((currentFilters) => ({
      ...currentFilters,
      ...patch,
    }));
  };

  return (
    <div
      className={`rounded-[1rem] border border-white/10 bg-[#202020] p-4 text-white shadow-[0_26px_86px_-58px_rgba(0,0,0,0.92)] ${
        compact ? "" : "sticky top-28"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="[font-family:var(--font-display)] text-lg font-semibold">
          {t("flights.filters.label")}
        </h3>
        {isActive ? (
          <button
            type="button"
            onClick={() => onChange(DEFAULT_FLIGHT_FILTERS)}
            className="text-xs font-semibold text-[var(--aw-accent)] transition hover:text-[var(--aw-accent-hover)]"
          >
            {t("flights.filters.clear")}
          </button>
        ) : null}
      </div>

      <div className="mt-5 space-y-5">
        <FilterSection title={t("flights.filters.sortBy")}>
          <div className="grid gap-2">
            {SORT_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => updateFilter({ sortBy: option })}
                className={`rounded-[0.75rem] border px-3 py-2 text-left text-sm font-semibold transition ${
                  filters.sortBy === option
                    ? "border-[var(--aw-accent)] bg-[var(--aw-accent)] text-slate-950"
                    : "border-white/10 bg-white/7 text-white/72 hover:border-white/18 hover:text-white"
                }`}
              >
                {option === "cheapest"
                  ? t("flights.filters.lowestPrice")
                  : t(`flights.filters.${option}`)}
              </button>
            ))}
          </div>
        </FilterSection>

        {options.hasArrivalTimes ? (
          <FilterSection title={t("flights.filters.arrivalTime")}>
            <div className="grid grid-cols-2 gap-2">
              {ARRIVAL_TIME_FILTERS.map((option) => (
                <FilterChip
                  key={option}
                  active={filters.arrivalTimes.includes(option)}
                  label={t(`flights.filters.${option}`)}
                  onClick={() =>
                    updateFilter({
                      arrivalTimes: toggleFilterValue(filters.arrivalTimes, option),
                    })
                  }
                />
              ))}
            </div>
          </FilterSection>
        ) : null}

        {options.hasStops ? (
          <FilterSection title={t("flights.filters.stops")}>
            <div className="grid gap-2">
              {STOP_FILTERS.map((option) => (
                <FilterChip
                  key={option}
                  active={filters.stops.includes(option)}
                  label={t(`flights.filters.${option}`)}
                  onClick={() =>
                    updateFilter({
                      stops: toggleFilterValue(filters.stops, option),
                    })
                  }
                />
              ))}
            </div>
          </FilterSection>
        ) : null}

        {options.airlines.length > 0 ? (
          <FilterSection title={t("flights.filters.airlinesIncluded")}>
            <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
              {options.airlines.map((airline) => (
                <FilterCheckbox
                  key={airline}
                  checked={filters.airlines.includes(airline)}
                  label={airline}
                  onChange={() =>
                    updateFilter({
                      airlines: toggleFilterValue(filters.airlines, airline),
                    })
                  }
                />
              ))}
            </div>
          </FilterSection>
        ) : null}

        {options.hasPrices ? (
          <FilterSection title={t("flights.filters.priceRange")}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <label className="grid gap-2">
                <span className="text-xs font-semibold text-white/58">
                  {t("flights.filters.minPrice")}
                </span>
                <input
                  type="number"
                  min="0"
                  value={filters.minPrice}
                  onChange={(event) => updateFilter({ minPrice: event.target.value })}
                  className="min-h-10 rounded-[0.7rem] border border-white/10 bg-[var(--aw-input)] px-3 text-sm font-bold text-slate-950 outline-none transition focus:border-[var(--aw-accent)]"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-semibold text-white/58">
                  {t("flights.filters.maxPrice")}
                </span>
                <input
                  type="number"
                  min="0"
                  value={filters.maxPrice}
                  onChange={(event) => updateFilter({ maxPrice: event.target.value })}
                  className="min-h-10 rounded-[0.7rem] border border-white/10 bg-[var(--aw-input)] px-3 text-sm font-bold text-slate-950 outline-none transition focus:border-[var(--aw-accent)]"
                />
              </label>
            </div>
          </FilterSection>
        ) : null}
      </div>
    </div>
  );
}

function FilterSection({ title, children }) {
  return (
    <section>
      <h4 className="text-xs font-black uppercase tracking-[0.18em] text-white/52">
        {title}
      </h4>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function FilterChip({ active, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[0.7rem] border px-3 py-2 text-left text-sm font-semibold transition ${
        active
          ? "border-[var(--aw-accent)] bg-[rgba(245,184,0,0.16)] text-[var(--aw-accent)]"
          : "border-white/10 bg-white/7 text-white/72 hover:border-white/18 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

function FilterCheckbox({ checked, label, onChange }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-[0.7rem] border border-white/10 bg-white/7 px-3 py-2 text-sm font-semibold text-white/72 transition hover:border-white/18 hover:text-white">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-white/20 bg-transparent text-[var(--aw-accent)] focus:ring-[var(--aw-accent)]"
      />
      <span className="min-w-0 truncate">{label}</span>
    </label>
  );
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
    <article className="flight-result-card group overflow-hidden rounded-[1rem] border border-white/10 bg-[#242424] p-4 text-white shadow-[0_30px_90px_-60px_rgba(0,0,0,0.92)] transition hover:-translate-y-0.5 hover:border-white/18 hover:shadow-[0_34px_96px_-58px_rgba(0,0,0,0.95)] sm:p-5">
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

          <div className="flight-route-panel grid gap-4 rounded-[0.9rem] bg-[#1c1c1c] p-4 sm:grid-cols-[minmax(0,1fr)_minmax(8rem,0.7fr)_minmax(0,1fr)] sm:items-center">
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
            <div className="rounded-[0.9rem] border border-white/10 bg-[#202020] px-4 py-3 text-sm font-semibold text-white/72">
              <span className="mr-2 text-xs uppercase tracking-[0.14em] text-white/46">
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

        <div className="flight-price-panel rounded-[0.9rem] border border-white/10 bg-[#1c1c1c] p-4 text-left lg:text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/46">
            {t("common.price")}
          </p>
          <p className="[font-family:var(--font-display)] mt-2 text-3xl font-semibold text-white">
            {price}
          </p>
          <p className="mt-2 text-xs text-white/52">
            {getSafeText(flightNumber, `${t("common.flight")} ${index + 1}`)}
          </p>

          <div className="mt-5 space-y-2">
            <button
              type="button"
              onClick={() => onBookingRequest?.(flight)}
              className="inline-flex w-full items-center justify-center rounded-full bg-[#f6b80f] px-4 py-3 text-center text-sm font-black uppercase text-slate-950 transition hover:bg-[#ffca2b]"
            >
              {t("flights.contactToBook")}
            </button>

            <button
              type="button"
              onClick={() => setDetailsOpen((currentValue) => !currentValue)}
              className="inline-flex w-full items-center justify-center rounded-full border border-white/12 px-4 py-3 text-sm font-semibold text-white/76 transition hover:border-white/24 hover:text-white"
            >
              {detailsOpen ? t("flights.hideDetails") : t("flights.showDetails")}
            </button>
          </div>
        </div>
      </div>

      {detailsOpen ? (
        <div className="flight-details-panel mt-5 rounded-[0.9rem] bg-[#1c1c1c] p-4">
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
                <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-2 lg:grid-cols-3">
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
        <span className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#242424] bg-white/10 text-xs font-bold text-white">
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
        width="48"
        height="48"
        loading="lazy"
        decoding="async"
        onError={() => setImageFailed(true)}
        className={`h-12 w-12 rounded-full border-2 border-[#242424] bg-white object-contain p-1 shadow-sm ${className}`}
      />
    );
  }

  return (
    <span
      className={`flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#242424] bg-[#f6b80f] text-sm font-black text-slate-950 shadow-sm ${className}`}
    >
      {getAirlineInitials(fallbackLabel)}
    </span>
  );
}

function FlightSegmentBreakdown({ flight, segments, lastSearch, language, t }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/46">
          {t("flights.flightDetails")}
        </p>
        <p className="mt-2 break-words text-lg font-semibold text-white">
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
              className="rounded-[0.9rem] border border-white/10 bg-[#202020] p-4"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--aw-accent)]">
                    {t("flights.segment")} {index + 1}
                  </p>
                  <h4 className="mt-2 text-base font-semibold text-white">
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
                <p className="mt-3 text-sm font-medium text-white/66">
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

      <div className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[1rem] border border-white/10 bg-[#202020] p-5 text-white shadow-[0_34px_120px_-48px_rgba(0,0,0,0.95)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--aw-accent)]">
              {t("flights.bookingRequest.eyebrow")}
            </p>
            <h2
              id="booking-request-title"
              className="[font-family:var(--font-display)] mt-2 text-2xl font-semibold text-white"
            >
              {t("flights.bookingRequest.title")}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/12 text-lg font-semibold text-white/64 transition hover:border-[var(--aw-accent)] hover:text-white"
          >
            x
          </button>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="rounded-[1rem] border border-white/10 bg-[#171717] p-4">
            <h3 className="text-sm font-semibold text-white">
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
              <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
                {selectedFlight.segments.map((segment, index) => (
                  <div
                    key={`${segment.flightNumber || "modal-segment"}-${index}`}
                    className="rounded-[0.85rem] border border-white/10 bg-[#202020] p-3 text-sm"
                  >
                    <p className="font-semibold text-white">
                      {t("flights.segment")} {index + 1}:{" "}
                      {getSegmentRouteLabel(segment)}
                    </p>
                    <p className="mt-1 text-white/64">
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
              <span className="text-sm font-semibold text-white/78">
                {t("flights.bookingRequest.message")}
              </span>
              <textarea
                name="customerMessage"
                value={form.customerMessage}
                onChange={onChange}
                rows={4}
                className="mt-2 w-full rounded-[0.85rem] border border-white/10 bg-[#171717] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--aw-accent)]"
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
              className="inline-flex w-full items-center justify-center rounded-full bg-[var(--aw-accent)] px-5 py-3 text-sm font-black text-slate-950 shadow-[0_18px_42px_-26px_rgba(245,184,0,0.9)] transition hover:bg-[var(--aw-accent-hover)] disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300 disabled:shadow-none"
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

      <div className="relative w-full max-w-lg rounded-[1rem] border border-white/10 bg-[#202020] p-6 text-center text-white shadow-[0_34px_120px_-48px_rgba(0,0,0,0.95)] sm:p-7">
        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/12 text-lg font-semibold text-white/64 transition hover:border-[var(--aw-accent)] hover:text-white"
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
          className="[font-family:var(--font-display)] mt-5 text-2xl font-semibold text-white"
        >
          {t("flights.bookingRequest.successTitle")}
        </h2>
        <p className="mt-3 text-sm leading-7 text-white/68">
          {t("flights.bookingRequest.success")}
        </p>
        <p className="mt-4 rounded-[1.1rem] bg-amber-50 px-4 py-3 text-sm font-medium leading-6 text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
          {t("flights.bookingRequest.priceWarning")}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-[var(--aw-accent)] px-5 py-3 text-sm font-black text-slate-950 shadow-[0_18px_42px_-26px_rgba(245,184,0,0.9)] transition hover:bg-[var(--aw-accent-hover)]"
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
      <span className="text-sm font-semibold text-white/78">
        {label}
      </span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        className="mt-2 w-full rounded-[0.85rem] border border-white/10 bg-[#171717] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--aw-accent)]"
      />
    </label>
  );
}

function FlightTimeBlock({ align, code, time, date }) {
  const alignment = align === "right" ? "text-left sm:text-right" : "text-left";

  return (
    <div className={alignment}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/46">
        {code}
      </p>
      <p className="mt-1 text-3xl font-semibold text-white">
        {time}
      </p>
      <p className="mt-1 text-sm text-white/52">{date}</p>
    </div>
  );
}

function FlightMeta({ label, value, wrap = false }) {
  return (
    <div>
      <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-white/46">
        {label}
      </span>
      <span
        className={`mt-1 block font-semibold text-white ${
          wrap ? "break-words" : "truncate"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
