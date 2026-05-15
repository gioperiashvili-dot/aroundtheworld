import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AutocompleteInput from "./AutocompleteInput";
import {
  findLocation,
  getFlightSearchValue,
  getLocationLabel,
  getLocationMeta,
  getLocationSuggestions,
} from "../data/locations";
import { useLanguage } from "../i18n/LanguageContext";
import { fetchFlightPriceCalendar } from "../lib/api";

const SEARCH_DEBOUNCE_MS = 850;
const PRICE_CALENDAR_MONTH_COUNT = 2;
const QUICK_DESTINATIONS = ["CDG", "IST", "LHR", "DXB", "ATH"];
const TRIP_TYPES = ["oneWay", "roundTrip", "multiCity"];
const CABIN_OPTIONS = ["economy", "premium_economy", "business", "first"];
const EMPTY_PRICE_CALENDAR_STATE = {
  calendar: {},
  loading: false,
  error: "",
  currency: "",
  requestedCurrency: "",
  currencyFallback: false,
};

function toLocationSuggestion(location, language) {
  return {
    id: location.id || location.code,
    primary: getLocationLabel(location, language),
    secondary: getLocationMeta(location, language),
    tag: location.code,
    value: getLocationLabel(location, language),
    location,
  };
}

export function buildFlightSearchParams(snapshot) {
  const params = new URLSearchParams();
  params.set("from", snapshot.from);
  params.set("fromLabel", snapshot.fromLabel);
  params.set("to", snapshot.to);
  params.set("toLabel", snapshot.toLabel);
  params.set("date", snapshot.date);
  params.set("tripType", snapshot.tripType);
  params.set("cabin", snapshot.cabin);
  params.set("adults", String(snapshot.travelers.adults));
  params.set("children", String(snapshot.travelers.children));
  params.set("infants", String(snapshot.travelers.infants));

  if (snapshot.returnDate) {
    params.set("returnDate", snapshot.returnDate);
  }

  if (snapshot.currencyCode) {
    params.set("currencyCode", snapshot.currencyCode);
  }

  params.set("human", snapshot.isHuman ? "1" : "0");
  params.set("auto", "1");
  return params;
}

function normalizeTripType(value, returnDate = "") {
  return TRIP_TYPES.includes(value) ? value : returnDate ? "roundTrip" : "oneWay";
}

function normalizeCabin(value) {
  return CABIN_OPTIONS.includes(value) ? value : "economy";
}

function parseTravelerCount(value, fallbackValue, minimumValue) {
  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed < minimumValue) {
    return fallbackValue;
  }

  return parsed;
}

function getTravelersTotal(travelers) {
  return travelers.adults + travelers.children + travelers.infants;
}

function parseDateInput(value) {
  const [year, month, day] = String(value || "")
    .split("-")
    .map((segment) => Number.parseInt(segment, 10));

  if (!year || !month || !day) {
    return null;
  }

  const parsedDate = new Date(year, month - 1, day);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthStartInput(date) {
  return formatDateInput(new Date(date.getFullYear(), date.getMonth(), 1));
}

function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function getMonthDays(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];

  for (let index = 0; index < startOffset; index += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function getCalendarLocale(language) {
  return language === "ka" ? "ka-GE" : "en-US";
}

function formatSelectedDate(value, language) {
  const parsedDate = parseDateInput(value);

  if (!parsedDate) {
    return "";
  }

  return parsedDate.toLocaleDateString(getCalendarLocale(language), {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getWeekdayLabels(language) {
  const baseDate = new Date(2024, 0, 1);

  return Array.from({ length: 7 }, (_, index) =>
    new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + index)
      .toLocaleDateString(getCalendarLocale(language), { weekday: "short" })
  );
}

function getPriceCalendarCurrency(currencyCode, language) {
  return String(currencyCode || (language === "ka" ? "GEL" : "USD"))
    .trim()
    .toUpperCase();
}

function getPriceCalendarLocale(language) {
  return language === "ka" ? "ka-GE" : "en-US";
}

function getPriceCalendarCountryCode(language) {
  return language === "ka" ? "GE" : "US";
}

function getPriceCalendarCacheKey({
  originSkyId,
  destinationSkyId,
  fromDate,
  currency,
  market,
  countryCode,
  locale,
}) {
  return [
    originSkyId,
    destinationSkyId,
    fromDate,
    currency,
    market,
    countryCode,
    locale,
  ].join("|");
}

function mergePriceCalendarResponses(responses) {
  return responses.reduce((calendar, response) => {
    if (response?.calendar && typeof response.calendar === "object") {
      return {
        ...calendar,
        ...response.calendar,
      };
    }

    return calendar;
  }, {});
}

function hasCalendarEntries(calendar) {
  return Object.keys(calendar || {}).length > 0;
}

function formatCompactCurrencyAmount(rawValue) {
  const amount = Number(rawValue);

  if (!Number.isFinite(amount)) {
    return "";
  }

  const roundedAmount = Math.round(amount);

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(roundedAmount);
}

function getCompactCalendarPriceLabel(price) {
  const rawAmount = Number(price?.raw);
  const currency = String(price?.currency || "").trim().toUpperCase();

  if (Number.isFinite(rawAmount)) {
    const amountLabel = formatCompactCurrencyAmount(rawAmount);

    if (currency === "GEL") {
      return `₾${amountLabel}`;
    }

    if (currency === "USD") {
      return `$${amountLabel}`;
    }

    if (currency === "EUR") {
      return `€${amountLabel}`;
    }

    return currency ? `${currency} ${amountLabel}` : amountLabel;
  }

  const formatted = String(price?.formatted || "").trim();

  if (!formatted) {
    return "";
  }

  return formatted
    .replace(/^GEL\s*/i, "₾")
    .replace(/^USD\s*/i, "$")
    .replace(/^EUR\s*/i, "€")
    .replace(/^US\$\s*/i, "$");
}

function getCalendarPriceTiers(priceCalendar) {
  const numericPrices = Object.values(priceCalendar || {})
    .map((price) => Number(price?.raw))
    .filter((price) => Number.isFinite(price));

  if (numericPrices.length < 3) {
    return null;
  }

  const sortedPrices = [...numericPrices].sort((a, b) => a - b);
  const bucketSize = Math.max(1, Math.round(sortedPrices.length * 0.33));
  const cheapMax = sortedPrices[bucketSize - 1];
  const expensiveMin = sortedPrices[sortedPrices.length - bucketSize];

  if (
    !Number.isFinite(cheapMax) ||
    !Number.isFinite(expensiveMin) ||
    cheapMax === expensiveMin
  ) {
    return null;
  }

  return {
    cheapMax,
    expensiveMin,
  };
}

function getCalendarPriceTier(price, priceTiers) {
  const rawAmount = Number(price?.raw);

  if (!priceTiers || !Number.isFinite(rawAmount)) {
    return "medium";
  }

  if (rawAmount <= priceTiers.cheapMax) {
    return "cheap";
  }

  if (rawAmount >= priceTiers.expensiveMin) {
    return "expensive";
  }

  return "medium";
}

function getCalendarPriceClassName(priceTier, isSelected) {
  if (isSelected) {
    return "border border-slate-950/10 bg-slate-950/10 text-slate-950";
  }

  if (priceTier === "cheap") {
    return "border border-[#9edeb8] bg-[#ddf7e8] text-[#247246]";
  }

  if (priceTier === "expensive") {
    return "border border-[#f0b6b2] bg-[#ffe3e1] text-[#ad3c35]";
  }

  return "border border-[#efd389] bg-[#fff1c2] text-[#8a6500]";
}

function buildAutoSearchKey(snapshot) {
  return [
    snapshot.from,
    snapshot.to,
    snapshot.date,
    snapshot.returnDate,
    snapshot.fromLabel,
    snapshot.toLabel,
    snapshot.tripType,
    snapshot.cabin,
    snapshot.travelers.adults,
    snapshot.travelers.children,
    snapshot.travelers.infants,
    snapshot.currencyCode,
  ].join("|");
}

export default function FlightSearchPanel({
  searchParams,
  loading = false,
  externalError = "",
  onSearch,
  onFormInteraction,
  onTripTypeChange,
  className = "",
  forcedTripType,
  showTripTypeOptions = true,
  availableTripTypes = TRIP_TYPES,
  variant = "default",
  currencyCode = "",
}) {
  const { language, t } = useLanguage();
  const isBookingVariant = variant === "booking";
  const [form, setForm] = useState({
    from: "",
    fromCode: "",
    to: "",
    toCode: "",
    date: "",
    isHuman: false,
  });
  const [tripType, setTripType] = useState("oneWay");
  const [cabin, setCabin] = useState("economy");
  const [travelers, setTravelers] = useState({
    adults: 1,
    children: 0,
    infants: 0,
  });
  const [returnDate, setReturnDate] = useState("");
  const [isTravelersOpen, setIsTravelersOpen] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [isDebouncing, setIsDebouncing] = useState(false);
  const [priceCalendarMonth, setPriceCalendarMonth] = useState("");
  const [priceCalendarState, setPriceCalendarState] = useState(EMPTY_PRICE_CALENDAR_STATE);
  const debounceRef = useRef(null);
  const lastAutoSearchRef = useRef("");
  const priceCalendarCacheRef = useRef(new Map());
  const priceCalendarRequestRef = useRef(0);
  const searchParamsString = searchParams?.toString() || "";

  const clearErrors = useCallback(() => {
    setValidationError("");
    onFormInteraction?.();
  }, [onFormInteraction]);

  const selectTripType = useCallback(
    (nextTripType) => {
      setTripType(nextTripType);
      onTripTypeChange?.(nextTripType);

      if (nextTripType !== "roundTrip") {
        setReturnDate("");
      }

      clearErrors();
    },
    [clearErrors, onTripTypeChange]
  );

  const handleCalendarVisibleMonthChange = useCallback((monthDate) => {
    setPriceCalendarMonth(getMonthStartInput(monthDate));
  }, []);

  useEffect(() => {
    if (!forcedTripType || !TRIP_TYPES.includes(forcedTripType)) {
      return;
    }

    setTripType(forcedTripType);

    if (forcedTripType !== "roundTrip") {
      setReturnDate("");
    }
  }, [forcedTripType]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const fromSuggestions = useMemo(
    () =>
      getLocationSuggestions(form.from).map((location) =>
        toLocationSuggestion(location, language)
      ),
    [form.from, language]
  );
  const toSuggestions = useMemo(
    () =>
      getLocationSuggestions(form.to).map((location) =>
        toLocationSuggestion(location, language)
      ),
    [form.to, language]
  );

  useEffect(() => {
    if (!searchParams) {
      return;
    }

    const fromParam = searchParams.get("from") || "";
    const toParam = searchParams.get("to") || "";
    const dateParam = searchParams.get("date") || "";
    const returnDateParam = searchParams.get("returnDate") || "";
    const parsedTripType = normalizeTripType(searchParams.get("tripType"), returnDateParam);
    const nextTripType =
      forcedTripType && TRIP_TYPES.includes(forcedTripType)
        ? forcedTripType
        : parsedTripType;
    const nextCabin = normalizeCabin(searchParams.get("cabin"));
    const nextCurrencyCode =
      searchParams.get("currencyCode") || currencyCode || "";
    const nextTravelers = {
      adults: parseTravelerCount(searchParams.get("adults"), 1, 1),
      children: parseTravelerCount(searchParams.get("children"), 0, 0),
      infants: parseTravelerCount(searchParams.get("infants"), 0, 0),
    };
    const fromLocation = findLocation(fromParam);
    const toLocation = findLocation(toParam);
    const fromLabel =
      searchParams.get("fromLabel") ||
      getLocationLabel(fromLocation, language) ||
      fromParam;
    const toLabel =
      searchParams.get("toLabel") ||
      getLocationLabel(toLocation, language) ||
      toParam;
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
    setTripType(nextTripType);
    setCabin(nextCabin);
    setTravelers(nextTravelers);
    setReturnDate(nextTripType === "roundTrip" ? returnDateParam : "");

    if (!fromParam || !toParam || !dateParam || searchParams.get("auto") !== "1") {
      return;
    }

    const snapshot = {
      from: fromParam,
      fromLabel,
      to: toParam,
      toLabel,
      date: dateParam,
      returnDate: nextTripType === "roundTrip" ? returnDateParam : "",
      tripType: nextTripType,
      cabin: nextCabin,
      travelers: nextTravelers,
      isHuman,
      currencyCode: nextCurrencyCode,
    };
    const searchKey = buildAutoSearchKey(snapshot);

    if (lastAutoSearchRef.current === searchKey) {
      return;
    }

    lastAutoSearchRef.current = searchKey;
    onSearch?.(snapshot, buildFlightSearchParams(snapshot), { auto: true });
  }, [currencyCode, forcedTripType, language, onSearch, searchParams, searchParamsString]);

  useEffect(() => {
    const originSkyId = findLocation(form.fromCode || form.from)?.code || form.fromCode;
    const destinationSkyId = findLocation(form.toCode || form.to)?.code || form.toCode;

    if (
      !originSkyId ||
      !destinationSkyId ||
      originSkyId === destinationSkyId ||
      !priceCalendarMonth
    ) {
      setPriceCalendarState((currentState) =>
        currentState.loading ||
        currentState.error ||
        currentState.currencyFallback ||
        hasCalendarEntries(currentState.calendar)
          ? EMPTY_PRICE_CALENDAR_STATE
          : currentState
      );
      return undefined;
    }

    const firstMonth = parseDateInput(priceCalendarMonth);

    if (!firstMonth) {
      return undefined;
    }

    const currency = getPriceCalendarCurrency(currencyCode, language);
    const market = getPriceCalendarLocale(language);
    const locale = market;
    const countryCode = getPriceCalendarCountryCode(language);
    const monthStarts = Array.from({ length: PRICE_CALENDAR_MONTH_COUNT }, (_, index) =>
      getMonthStartInput(addMonths(firstMonth, index))
    );
    const cachedResponses = [];
    const pendingRequests = [];

    monthStarts.forEach((fromDate) => {
      const cacheKey = getPriceCalendarCacheKey({
        originSkyId,
        destinationSkyId,
        fromDate,
        currency,
        market,
        countryCode,
        locale,
      });
      const cachedResponse = priceCalendarCacheRef.current.get(cacheKey);

      if (cachedResponse) {
        cachedResponses.push(cachedResponse);
        return;
      }

      pendingRequests.push({
        cacheKey,
        params: {
          originSkyId,
          destinationSkyId,
          fromDate,
          currency,
          market,
          countryCode,
          locale,
        },
      });
    });

    const requestId = priceCalendarRequestRef.current + 1;
    priceCalendarRequestRef.current = requestId;

    if (pendingRequests.length === 0) {
      setPriceCalendarState({
        calendar: mergePriceCalendarResponses(cachedResponses),
        loading: false,
        error: "",
        currency: cachedResponses.find((response) => response?.currency)?.currency || currency,
        requestedCurrency:
          cachedResponses.find((response) => response?.requestedCurrency)?.requestedCurrency ||
          currency,
        currencyFallback: cachedResponses.some((response) => response?.currencyFallback),
      });
      return undefined;
    }

    setPriceCalendarState({
      calendar: mergePriceCalendarResponses(cachedResponses),
      loading: true,
      error: "",
      currency: cachedResponses.find((response) => response?.currency)?.currency || currency,
      requestedCurrency:
        cachedResponses.find((response) => response?.requestedCurrency)?.requestedCurrency ||
        currency,
      currencyFallback: cachedResponses.some((response) => response?.currencyFallback),
    });

    let isActive = true;

    Promise.allSettled(
      pendingRequests.map(async ({ cacheKey, params }) => {
        const response = await fetchFlightPriceCalendar(params);
        priceCalendarCacheRef.current.set(cacheKey, response);
        return response;
      })
    ).then((settledResponses) => {
      if (!isActive || priceCalendarRequestRef.current !== requestId) {
        return;
      }

      const fulfilledResponses = settledResponses
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value);
      const allResponses = [...cachedResponses, ...fulfilledResponses];
      const calendar = mergePriceCalendarResponses(allResponses);

      setPriceCalendarState({
        calendar,
        loading: false,
        error:
          fulfilledResponses.length === 0 && !hasCalendarEntries(calendar)
            ? "unavailable"
            : "",
        currency: allResponses.find((response) => response?.currency)?.currency || currency,
        requestedCurrency:
          allResponses.find((response) => response?.requestedCurrency)?.requestedCurrency ||
          currency,
        currencyFallback: allResponses.some((response) => response?.currencyFallback),
      });
    });

    return () => {
      isActive = false;
    };
  }, [
    currencyCode,
    form.from,
    form.fromCode,
    form.to,
    form.toCode,
    language,
    priceCalendarMonth,
  ]);

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
      returnDate: tripType === "roundTrip" ? returnDate.trim() : "",
      tripType,
      cabin,
      travelers,
      isHuman: form.isHuman,
      currencyCode,
    };

    if (!snapshot.fromLabel || !snapshot.toLabel || !snapshot.date) {
      setValidationError(t("flights.errors.required"));
      return;
    }

    if (snapshot.tripType === "multiCity") {
      setValidationError(t("flights.errors.multiCity"));
      return;
    }

    if (snapshot.from.trim().toLowerCase() === snapshot.to.trim().toLowerCase()) {
      setValidationError(t("flights.errors.sameRoute"));
      return;
    }

    if (snapshot.tripType === "roundTrip" && !snapshot.returnDate) {
      setValidationError(t("flights.errors.returnRequired"));
      return;
    }

    if (
      snapshot.travelers.adults < 1 ||
      snapshot.travelers.children < 0 ||
      snapshot.travelers.infants < 0
    ) {
      setValidationError(t("flights.errors.travelers"));
      return;
    }

    if (!snapshot.isHuman) {
      setValidationError(t("flights.errors.human"));
      return;
    }

    const nextParams = buildFlightSearchParams(snapshot);

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    setIsDebouncing(true);
    setValidationError("");
    debounceRef.current = window.setTimeout(() => {
      setIsDebouncing(false);
      onSearch?.(snapshot, nextParams, { auto: false });
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
    clearErrors();
  };

  const updateTravelerCount = (type, delta) => {
    setTravelers((previousTravelers) => {
      const minimumValue = type === "adults" ? 1 : 0;
      const nextValue = Math.max(previousTravelers[type] + delta, minimumValue);

      return {
        ...previousTravelers,
        [type]: nextValue,
      };
    });
    clearErrors();
  };

  const isBusy = loading || isDebouncing;
  const statusLabel = loading
    ? t("flights.searchingButton")
    : isDebouncing
      ? t("flights.preparingButton")
      : t("flights.searchButton");
  const flightsHeading = t("flights.heading");
  const showReturnDate = tripType === "roundTrip";
  const isMultiCity = tripType === "multiCity";
  const displayError = validationError || externalError;

  return (
    <div className={`${className} ${isBookingVariant ? "flight-search-panel--booking" : ""}`}>
      <div
        className={
          isBookingVariant
            ? "overflow-visible"
            : "overflow-visible rounded-[2.25rem] border border-white/75 bg-white/95 shadow-[0_34px_100px_-58px_rgba(15,23,42,0.6)] backdrop-blur dark:border-white/10 dark:bg-transparent dark:shadow-[0_34px_100px_-58px_rgba(2,6,23,0.95)]"
        }
      >
        <div className={isBookingVariant ? "space-y-5" : "space-y-6 p-4 sm:p-5 lg:p-7"}>
          {!isBookingVariant ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--aw-accent)]">
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
          ) : null}

          <form className="space-y-5" onSubmit={handleSubmit}>
            {showTripTypeOptions ? (
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <TripTypeOptions
                  tripType={tripType}
                  onChange={selectTripType}
                  t={t}
                  availableTripTypes={availableTripTypes}
                  variant={variant}
                />

                <CabinSelect
                  value={cabin}
                  onChange={(event) => {
                    setCabin(event.target.value);
                    clearErrors();
                  }}
                  t={t}
                  className="lg:min-w-[12rem]"
                  variant={variant}
                />
              </div>
            ) : (
              <div className="flex justify-end">
                <CabinSelect
                  value={cabin}
                  onChange={(event) => {
                    setCabin(event.target.value);
                    clearErrors();
                  }}
                  t={t}
                  className="w-full sm:w-56"
                  variant={variant}
                />
              </div>
            )}

            {isMultiCity ? (
              <div className="rounded-[1.4rem] bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:bg-amber-500/10 dark:text-amber-100">
                {t("flights.multiCityComingSoon")}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 xl:flex-row xl:items-stretch">
              <FieldCard className="xl:min-w-0 xl:flex-[1.16]" variant={variant}>
                <AutocompleteInput
                  label={t("common.from")}
                  value={form.from}
                  onChange={(value) => {
                    setForm((previousForm) => ({
                      ...previousForm,
                      from: value,
                      fromCode: "",
                    }));
                    clearErrors();
                  }}
                  onSelect={(suggestion) => {
                    setForm((previousForm) => ({
                      ...previousForm,
                      from: suggestion.value,
                      fromCode: suggestion.location.code,
                    }));
                    clearErrors();
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
                className="flex h-12 w-12 shrink-0 items-center justify-center self-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-[0_16px_34px_-26px_rgba(15,23,42,0.8)] transition hover:-translate-y-0.5 hover:border-[var(--aw-accent)] hover:text-slate-950 dark:border-white/10 dark:bg-[var(--aw-panel)] dark:text-white/84 dark:hover:border-[var(--aw-accent)] dark:hover:text-[var(--aw-accent-hover)] xl:h-[4.6rem] xl:w-[4.6rem]"
              >
                <SwapIcon />
              </button>

              <FieldCard className="xl:min-w-0 xl:flex-[1.16]" variant={variant}>
                <AutocompleteInput
                  label={t("common.to")}
                  value={form.to}
                  onChange={(value) => {
                    setForm((previousForm) => ({
                      ...previousForm,
                      to: value,
                      toCode: "",
                    }));
                    clearErrors();
                  }}
                  onSelect={(suggestion) => {
                    setForm((previousForm) => ({
                      ...previousForm,
                      to: suggestion.value,
                      toCode: suggestion.location.code,
                    }));
                    clearErrors();
                  }}
                  suggestions={toSuggestions}
                  placeholder={t("flights.placeholders.to")}
                  noSuggestionsText={t("common.noSuggestions")}
                />
              </FieldCard>

              <FieldCard className="xl:min-w-[11.5rem] xl:flex-[0.82]" variant={variant}>
                <DateField
                  label={t("flights.departureLabel")}
                  name="date"
                  value={form.date}
                  language={language}
                  t={t}
                  priceCalendar={priceCalendarState.calendar}
                  priceCalendarLoading={priceCalendarState.loading}
                  priceCalendarError={priceCalendarState.error}
                  priceCalendarCurrency={priceCalendarState.currency}
                  priceCalendarCurrencyFallback={priceCalendarState.currencyFallback}
                  onVisibleMonthChange={handleCalendarVisibleMonthChange}
                  onChange={(event) => {
                    setForm((previousForm) => ({
                      ...previousForm,
                      date: event.target.value,
                    }));
                    clearErrors();
                  }}
                />
              </FieldCard>

              {showReturnDate ? (
                <FieldCard className="xl:min-w-[11.5rem] xl:flex-[0.82]" variant={variant}>
                  <DateField
                    label={t("flights.returnLabel")}
                    name="returnDate"
                    value={returnDate}
                    language={language}
                    t={t}
                    priceCalendar={priceCalendarState.calendar}
                    priceCalendarLoading={priceCalendarState.loading}
                    priceCalendarError={priceCalendarState.error}
                    priceCalendarCurrency={priceCalendarState.currency}
                    priceCalendarCurrencyFallback={priceCalendarState.currencyFallback}
                    onVisibleMonthChange={handleCalendarVisibleMonthChange}
                    showNoReturnAction
                    onNoReturn={() => selectTripType("oneWay")}
                    onChange={(event) => {
                      setReturnDate(event.target.value);
                      clearErrors();
                    }}
                  />
                </FieldCard>
              ) : null}

              <TravelersField
                travelers={travelers}
                isOpen={isTravelersOpen}
                onToggle={() => setIsTravelersOpen((currentValue) => !currentValue)}
                onChange={updateTravelerCount}
                t={t}
                className="xl:min-w-[10rem] xl:flex-[0.78]"
                variant={variant}
              />

              <button
                type="submit"
                disabled={isBusy || isMultiCity}
                aria-label={statusLabel}
                className={
                  isBookingVariant
                    ? "group flex h-14 w-full shrink-0 items-center justify-center rounded-[0.7rem] bg-[var(--aw-accent)] px-6 text-sm font-black uppercase text-slate-950 shadow-[0_18px_34px_-26px_rgba(245,184,0,0.9)] transition hover:-translate-y-0.5 hover:bg-[var(--aw-accent-hover)] disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300 disabled:shadow-none xl:h-[4.6rem] xl:w-auto xl:min-w-[10rem]"
                    : "group flex h-14 w-full shrink-0 items-center justify-center rounded-[1.25rem] bg-[var(--aw-accent)] px-5 text-sm font-black uppercase text-slate-950 shadow-[0_22px_44px_-26px_rgba(245,184,0,0.9)] transition hover:-translate-y-0.5 hover:bg-[var(--aw-accent-hover)] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700 disabled:shadow-none dark:disabled:bg-slate-700 dark:disabled:text-slate-300 xl:h-[4.6rem] xl:w-[4.6rem] xl:rounded-full xl:px-0"
                }
              >
                <SearchIcon />
                <span className={`ml-2 ${isBookingVariant ? "" : "xl:sr-only"}`}>
                  {statusLabel}
                </span>
              </button>
            </div>

            <div
              className={
                isBookingVariant
                  ? "flex flex-col gap-4 rounded-[0.85rem] border border-white/10 bg-black/20 p-4 md:flex-row md:items-center md:justify-between"
                  : "flex flex-col gap-4 rounded-[1.75rem] bg-slate-50 p-4 md:flex-row md:items-center md:justify-between dark:bg-slate-900/80"
              }
            >
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
                    clearErrors();
                  }}
                  className="h-5 w-5 rounded border-slate-300 text-[var(--aw-accent)] focus:ring-[var(--aw-accent)]"
                />
                {t("flights.humanCheck")}
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`form-field-label text-xs font-semibold uppercase tracking-[0.18em] ${
                    isBookingVariant
                      ? "text-white/78"
                      : "text-slate-700 dark:text-white/76"
                  }`}
                >
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
                      onClick={() => {
                        setForm((previousForm) => ({
                          ...previousForm,
                          to: getLocationLabel(location, language),
                          toCode: location.code,
                        }));
                        clearErrors();
                      }}
                      className={`rounded-full bg-[rgba(245,184,0,0.14)] px-3 py-2 text-sm font-semibold transition hover:bg-[rgba(245,184,0,0.22)] ${
                        isBookingVariant
                          ? "text-[var(--aw-accent-hover)]"
                          : "text-[#6f5200] dark:text-[var(--aw-accent-hover)]"
                      }`}
                    >
                      {getLocationLabel(location, language)}
                    </button>
                  );
                })}
              </div>
            </div>
          </form>
        </div>

        {displayError ? (
          <div className="border-t border-rose-100 bg-rose-50 px-6 py-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
            {displayError}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TripTypeOptions({
  tripType,
  onChange,
  t,
  availableTripTypes = TRIP_TYPES,
  variant = "default",
}) {
  const isBookingVariant = variant === "booking";

  return (
    <div
      role="radiogroup"
      aria-label={t("flights.tripTypeLabel")}
      className={
        isBookingVariant
          ? "inline-flex w-full flex-wrap gap-1 rounded-full bg-black/30 p-1 sm:w-auto"
          : "inline-flex w-full flex-wrap gap-1 rounded-full bg-slate-100 p-1 dark:bg-slate-900 sm:w-auto"
      }
    >
      {availableTripTypes.map((type) => {
        const isSelected = tripType === type;

        return (
          <button
            key={type}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(type)}
            className={`min-h-10 flex-1 rounded-full px-4 py-2 text-sm font-semibold transition sm:flex-none ${
              isBookingVariant
                ? isSelected
                  ? "bg-[var(--aw-accent)] text-slate-950 shadow-[0_12px_30px_-22px_rgba(245,184,0,0.9)]"
                  : "text-white/72 hover:bg-white/8 hover:text-white"
                : isSelected
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

function FieldCard({ children, className = "", variant = "default" }) {
  const isBookingVariant = variant === "booking";

  return (
    <div
      className={`min-h-[4.6rem] min-w-0 px-4 py-3 transition ${
        isBookingVariant
          ? "rounded-[0.7rem] border border-white/10 bg-[var(--aw-input)] shadow-[0_18px_42px_-34px_rgba(0,0,0,0.9)] focus-within:border-[var(--aw-accent)]"
          : "rounded-[1.35rem] border border-slate-200 bg-white shadow-[0_18px_46px_-40px_rgba(15,23,42,0.9)] focus-within:border-[var(--aw-accent)] dark:border-white/10 dark:bg-[var(--aw-panel)]"
      } ${className}`}
    >
      {children}
    </div>
  );
}

function DateField({
  label,
  name,
  value,
  onChange,
  language,
  t,
  priceCalendar = {},
  priceCalendarLoading = false,
  priceCalendarError = "",
  priceCalendarCurrency = "",
  priceCalendarCurrencyFallback = false,
  onVisibleMonthChange,
  showNoReturnAction = false,
  onNoReturn,
}) {
  const selectedDate = useMemo(() => parseDateInput(value), [value]);
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const dateForMonth = selectedDate || new Date();
    return new Date(dateForMonth.getFullYear(), dateForMonth.getMonth(), 1);
  });
  const selectedLabel = formatSelectedDate(value, language);
  const weekdayLabels = useMemo(() => getWeekdayLabels(language), [language]);
  const priceTiers = useMemo(
    () => getCalendarPriceTiers(priceCalendar),
    [priceCalendar]
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const nextDate = selectedDate || new Date();
    setVisibleMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
  }, [isOpen, selectedDate]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    onVisibleMonthChange?.(visibleMonth);
  }, [isOpen, onVisibleMonthChange, visibleMonth]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectDate = (date) => {
    onChange({
      target: {
        name,
        value: formatDateInput(date),
      },
    });
    setIsOpen(false);
  };

  return (
    <div className="relative text-left">
      <span className="form-field-label block text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-400">
        {label}
      </span>
      <button
        type="button"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        className="mt-2 flex w-full min-w-0 items-center justify-between gap-3 bg-transparent text-left text-sm font-semibold text-slate-950 outline-none transition dark:text-white"
        aria-label={`${t("flights.datePicker.chooseDate")}: ${label}`}
        aria-expanded={isOpen}
      >
        <span className={selectedLabel ? "truncate" : "truncate text-slate-500"}>
          {selectedLabel || t("flights.datePicker.chooseDate")}
        </span>
        <CalendarIcon />
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label={t("flights.datePicker.close")}
            onClick={() => setIsOpen(false)}
          />

          <div className="flight-calendar-dialog relative z-10 max-h-[86vh] w-full overflow-y-auto rounded-t-[1.35rem] border border-slate-200 bg-[#fbfaf7] p-4 text-slate-950 shadow-[0_30px_120px_-42px_rgba(0,0,0,0.72)] sm:max-h-[80vh] sm:max-w-[900px] sm:rounded-[1.35rem] sm:p-5">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <button
              type="button"
              onClick={() => setVisibleMonth((currentMonth) => addMonths(currentMonth, -1))}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-[var(--aw-accent)] hover:bg-[rgba(245,184,0,0.08)] hover:text-slate-950"
              aria-label={t("flights.datePicker.previousMonth")}
            >
              <ChevronLeftIcon />
            </button>
            <p className="calendar-heading text-center text-sm font-bold text-slate-700 sm:text-base">
              {t("flights.datePicker.chooseDate")}
            </p>
            <button
              type="button"
              onClick={() => setVisibleMonth((currentMonth) => addMonths(currentMonth, 1))}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-[var(--aw-accent)] hover:bg-[rgba(245,184,0,0.08)] hover:text-slate-950"
              aria-label={t("flights.datePicker.nextMonth")}
            >
              <ChevronRightIcon />
            </button>
          </div>

          <div className="mt-4 grid gap-5 md:grid-cols-2">
            {[visibleMonth, addMonths(visibleMonth, 1)].map((monthDate, index) => (
              <div key={`${monthDate.getFullYear()}-${monthDate.getMonth()}`} className={index === 1 ? "hidden md:block" : ""}>
                <CalendarMonth
                  monthDate={monthDate}
                  selectedValue={value}
                  weekdayLabels={weekdayLabels}
                  language={language}
                  priceCalendar={priceCalendar}
                  priceTiers={priceTiers}
                  onSelect={handleSelectDate}
                />
              </div>
            ))}
          </div>

          {priceTiers ? (
            <CalendarPriceLegend t={t} />
          ) : null}

          {priceCalendarLoading || priceCalendarError || priceCalendarCurrencyFallback ? (
            <div className="mt-4 rounded-[0.85rem] bg-white px-3 py-2 text-center text-xs font-semibold text-slate-500">
              {priceCalendarLoading
                ? t("flights.datePicker.loadingPrices")
                : priceCalendarError
                  ? t("flights.datePicker.pricesUnavailable")
                  : t("flights.datePicker.pricesCurrencyFallback").replace(
                      "{currency}",
                      priceCalendarCurrency || "USD"
                    )}
            </div>
          ) : null}

          {showNoReturnAction ? (
            <button
              type="button"
              onClick={() => {
                onNoReturn?.();
                setIsOpen(false);
              }}
              className="mt-4 w-full rounded-[0.9rem] border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-[var(--aw-accent)] hover:text-slate-950"
            >
              {t("flights.datePicker.noReturnTicket")}
            </button>
          ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CalendarMonth({
  monthDate,
  selectedValue,
  weekdayLabels,
  language,
  priceCalendar = {},
  priceTiers,
  onSelect,
}) {
  const monthLabel = monthDate.toLocaleDateString(getCalendarLocale(language), {
    month: "long",
    year: "numeric",
  });
  const todayValue = formatDateInput(new Date());

  return (
    <section>
      <h3 className="calendar-month-title text-center [font-family:var(--font-display)] text-lg font-semibold capitalize text-slate-950">
        {monthLabel}
      </h3>
      <div className="mt-4 grid grid-cols-7 gap-1 text-center">
        {weekdayLabels.map((weekday) => (
          <span
            key={weekday}
            className="calendar-weekday py-1 text-[11px] font-bold text-slate-500"
          >
            {weekday}
          </span>
        ))}
        {getMonthDays(monthDate).map((date, index) => {
          if (!date) {
            return <span key={`blank-${index}`} className="min-h-11" />;
          }

          const dateValue = formatDateInput(date);
          const isSelected = selectedValue === dateValue;
          const isToday = todayValue === dateValue;
          const dayPrice = priceCalendar?.[dateValue];
          const priceLabel = getCompactCalendarPriceLabel(dayPrice);
          const priceTier = getCalendarPriceTier(dayPrice, priceTiers);

          return (
            <button
              key={dateValue}
              type="button"
              onClick={() => onSelect(date)}
              className={`flex min-h-[3.75rem] flex-col items-center justify-center rounded-[0.8rem] border px-1.5 py-2 text-sm font-bold transition ${
                isSelected
                  ? "border-[var(--aw-accent)] bg-[var(--aw-accent)] text-slate-950 shadow-[0_14px_30px_-20px_rgba(245,184,0,0.95)]"
                  : isToday
                    ? "border-[var(--aw-accent)] bg-[rgba(245,184,0,0.08)] text-slate-950"
                    : "border-transparent bg-transparent text-slate-700 hover:border-[rgba(245,184,0,0.42)] hover:bg-[rgba(245,184,0,0.08)] hover:text-slate-950"
              }`}
            >
              <span>{date.getDate()}</span>
              {priceLabel ? (
                <span
                  className={`mt-1 max-w-full rounded-full px-1.5 py-0.5 text-[10px] font-black leading-none tabular-nums sm:text-[11px] ${getCalendarPriceClassName(
                    priceTier,
                    isSelected
                  )}`}
                >
                  {priceLabel}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function CalendarPriceLegend({ t }) {
  const items = [
    { key: "low", label: t("flights.datePicker.lowPrice"), tier: "cheap" },
    { key: "medium", label: t("flights.datePicker.mediumPrice"), tier: "medium" },
    { key: "high", label: t("flights.datePicker.highPrice"), tier: "expensive" },
  ];

  return (
    <div className="mt-4 flex flex-wrap justify-center gap-2">
      {items.map((item) => (
        <span
          key={item.key}
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${getCalendarPriceClassName(
            item.tier,
            false
          )}`}
        >
          {item.label}
        </span>
      ))}
    </div>
  );
}

function CabinSelect({ value, onChange, t, className = "", variant = "default" }) {
  const isBookingVariant = variant === "booking";

  return (
    <div
      className={`min-h-[4.6rem] px-4 py-3 text-left ${
        isBookingVariant
          ? "rounded-[0.7rem] border border-white/10 bg-[var(--aw-input)] shadow-[0_18px_42px_-34px_rgba(0,0,0,0.9)] focus-within:border-[var(--aw-accent)]"
          : "rounded-[1.35rem] border border-slate-200 bg-white shadow-[0_18px_46px_-40px_rgba(15,23,42,0.9)] dark:border-slate-800 dark:bg-slate-900/90"
      } ${className}`}
    >
      <label className="block">
        <span className="sr-only">
          {t("flights.cabinLabel")}
        </span>
        <select
          value={value}
          onChange={onChange}
          className="mt-2 w-full bg-transparent text-sm font-semibold text-slate-950 outline-none dark:text-white"
        >
          {CABIN_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {t(`flights.cabinClasses.${option}`)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function TravelersField({
  travelers,
  isOpen,
  onToggle,
  onChange,
  t,
  className = "",
  variant = "default",
}) {
  const isBookingVariant = variant === "booking";
  const totalTravelers = getTravelersTotal(travelers);
  const summary =
    totalTravelers === 1
      ? t("flights.travelersSummaryOne")
      : t("flights.travelersSummaryMany").replace("{count}", totalTravelers);

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className={
          isBookingVariant
            ? "min-h-[4.6rem] w-full rounded-[0.7rem] border border-white/10 bg-[var(--aw-input)] px-4 py-3 text-left shadow-[0_18px_42px_-34px_rgba(0,0,0,0.9)] transition hover:border-[var(--aw-accent)]"
            : "min-h-[4.6rem] w-full rounded-[1.35rem] border border-slate-200 bg-white px-4 py-3 text-left shadow-[0_18px_46px_-40px_rgba(15,23,42,0.9)] transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-slate-700"
        }
      >
        <span className="form-field-label block text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-400">
          {t("flights.travelersLabel")}
        </span>
        <span className="mt-2 flex min-w-0 items-center justify-between gap-3 text-sm font-semibold text-slate-950 dark:text-white">
          <span className="min-w-0 truncate">{summary}</span>
          <span className="h-2 w-2 rotate-45 border-b border-r border-slate-400 dark:border-slate-500" />
        </span>
      </button>

      {isOpen ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.75rem)] z-30 rounded-[1.35rem] border border-slate-200 bg-white p-3 shadow-[0_24px_60px_-38px_rgba(15,23,42,0.55)] dark:border-slate-700 dark:bg-slate-900 sm:left-auto sm:w-80">
          <TravelerCounter
            label={t("flights.travelers.adults")}
            value={travelers.adults}
            minValue={1}
            onDecrease={() => onChange("adults", -1)}
            onIncrease={() => onChange("adults", 1)}
            t={t}
          />
          <TravelerCounter
            label={t("flights.travelers.children")}
            value={travelers.children}
            minValue={0}
            onDecrease={() => onChange("children", -1)}
            onIncrease={() => onChange("children", 1)}
            t={t}
          />
          <TravelerCounter
            label={t("flights.travelers.infants")}
            value={travelers.infants}
            minValue={0}
            onDecrease={() => onChange("infants", -1)}
            onIncrease={() => onChange("infants", 1)}
            t={t}
          />
        </div>
      ) : null}
    </div>
  );
}

function TravelerCounter({ label, value, minValue, onDecrease, onIncrease, t }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[1rem] px-2 py-3">
      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        {label}
      </span>
      <span className="flex items-center gap-3">
        <button
          type="button"
          disabled={value <= minValue}
          onClick={onDecrease}
          aria-label={`${t("flights.decrease")} ${label}`}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-lg font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          -
        </button>
        <span className="min-w-6 text-center text-sm font-semibold text-slate-950 dark:text-white">
          {value}
        </span>
        <button
          type="button"
          onClick={onIncrease}
          aria-label={`${t("flights.increase")} ${label}`}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-lg font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          +
        </button>
      </span>
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
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
