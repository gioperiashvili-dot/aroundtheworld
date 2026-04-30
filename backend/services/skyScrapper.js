const { SKY_SCRAPPER_HOST } = require("../config/env");
const { rapidApiGet } = require("./rapidapi");
const { logProviderDiagnostic } = require("../utils/providerDiagnostics");

const AIRPORT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const FLIGHT_CACHE_TTL_MS = 15 * 60 * 1000;
const FLIGHT_NEGATIVE_CACHE_TTL_MS = 2 * 60 * 1000;
const RETRY_DELAY_MIN_MS = 2000;
const RETRY_DELAY_MAX_MS = 3000;
const PROVIDER_LIMITED_CODE = "PROVIDER_LIMITED";

const airportCache = new Map();
const flightCache = new Map();
const flightNegativeCache = new Map();
const inFlightFlightRequests = new Map();
const KNOWN_SKY_SCRAPPER_CODES = new Set([
  PROVIDER_LIMITED_CODE,
  "BLOCKED_OR_CAPTCHA",
  "PROVIDER_UNAVAILABLE",
  "UNKNOWN_PROVIDER_ERROR",
  "VALIDATION_ERROR",
  "SERVER_CONFIGURATION_ERROR",
]);

function createSkyScrapperError(statusCode, error, details, code) {
  const requestError = new Error(error);
  requestError.statusCode = statusCode;
  requestError.details = details;
  requestError.code = code;
  return requestError;
}

function createValidationError(error, details) {
  return createSkyScrapperError(400, error, details, "VALIDATION_ERROR");
}

function getCachedValue(cache, key) {
  const cachedEntry = cache.get(key);

  if (!cachedEntry) {
    return null;
  }

  if (cachedEntry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }

  return cachedEntry.value;
}

function setCachedValue(cache, key, value, ttlMs) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });

  return value;
}

function snapshotSkyScrapperError(error) {
  return {
    statusCode: error?.statusCode || error?.response?.status || 502,
    message: error?.message || "Flight provider is temporarily unavailable.",
    details: error?.details,
    code: error?.code || "PROVIDER_UNAVAILABLE",
  };
}

function restoreSkyScrapperError(snapshot) {
  const restoredError = createSkyScrapperError(
    snapshot.statusCode,
    snapshot.message,
    snapshot.details,
    snapshot.code
  );
  restoredError.cached = true;
  return restoredError;
}

function normalizeText(value) {
  return value?.trim().toLowerCase() || "";
}

function looksLikeCode(value) {
  return /^[a-z0-9]{3,4}$/i.test(value?.trim() || "");
}

function stringifyProviderValue(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch (_error) {
    return String(value);
  }
}

function looksLikeHtmlPayload(value) {
  const normalizedValue = stringifyProviderValue(value).trim().toLowerCase();

  return (
    normalizedValue.startsWith("<!doctype html") ||
    normalizedValue.startsWith("<html") ||
    normalizedValue.includes("<body") ||
    normalizedValue.includes("</html>")
  );
}

function isBlockedMessage(value) {
  if (!value) {
    return false;
  }

  if (value?.action === "captcha") {
    return true;
  }

  const normalizedValue = stringifyProviderValue(value).toLowerCase();

  return (
    normalizedValue.includes("captcha") ||
    normalizedValue.includes("challenge") ||
    normalizedValue.includes("too many requests") ||
    normalizedValue.includes("too many") ||
    normalizedValue.includes("rate limit") ||
    normalizedValue.includes("quota") ||
    normalizedValue.includes("limit exceeded") ||
    normalizedValue.includes("usage limit") ||
    normalizedValue.includes("request limit") ||
    normalizedValue.includes("temporarily blocked") ||
    normalizedValue.includes("request blocked") ||
    normalizedValue.includes("access denied") ||
    normalizedValue.includes("forbidden") ||
    normalizedValue.includes("perimeterx") ||
    /\bblocked\b/.test(normalizedValue) ||
    normalizedValue.includes("bot challenge") ||
    (looksLikeHtmlPayload(value) &&
      (normalizedValue.includes("captcha") ||
        normalizedValue.includes("blocked") ||
        normalizedValue.includes("challenge")))
  );
}

function isBlockedPayload(payload) {
  return (
    isBlockedMessage(payload) ||
    isBlockedMessage(payload?.message) ||
    isBlockedMessage(payload?.error)
  );
}

function isHtmlPayload(payload) {
  return looksLikeHtmlPayload(payload) || looksLikeHtmlPayload(payload?.data);
}

function isTransientProviderMessage(value) {
  if (!value) {
    return false;
  }

  const normalizedValue = stringifyProviderValue(value).toLowerCase();

  return (
    normalizedValue.includes("timeout") ||
    normalizedValue.includes("timed out") ||
    normalizedValue.includes("proxyerror") ||
    normalizedValue.includes("cannot connect to proxy") ||
    normalizedValue.includes("connection reset") ||
    normalizedValue.includes("max retries exceeded") ||
    normalizedValue.includes("temporarily unavailable") ||
    normalizedValue.includes("service unavailable")
  );
}

function isTransientPayload(payload) {
  return (
    isTransientProviderMessage(payload?.message) ||
    isTransientProviderMessage(payload?.error)
  );
}

function isBlockedError(error) {
  const statusCode = error?.response?.status;

  if (statusCode === 403 || statusCode === 429) {
    return true;
  }

  return (
    isBlockedMessage(error?.response?.data?.message) ||
    isBlockedMessage(error?.response?.data?.error) ||
    isBlockedMessage(error?.response?.data) ||
    isBlockedMessage(error?.message)
  );
}

function isTransientError(error) {
  const statusCode = error?.response?.status;

  if (
    ["ECONNABORTED", "ECONNRESET", "ETIMEDOUT"].includes(error?.code) ||
    [408, 500, 502, 503, 504].includes(statusCode)
  ) {
    return true;
  }

  return (
    isTransientProviderMessage(error?.response?.data?.message) ||
    isTransientProviderMessage(error?.response?.data?.error) ||
    isTransientProviderMessage(error?.response?.data) ||
    isTransientProviderMessage(error?.message)
  );
}

function getRetryDelayMs() {
  return (
    RETRY_DELAY_MIN_MS +
    Math.floor(Math.random() * (RETRY_DELAY_MAX_MS - RETRY_DELAY_MIN_MS + 1))
  );
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitBeforeRetry(endpoint, attempt, reason) {
  const delayMs = getRetryDelayMs();

  logSkyScrapperDiagnostic(
    "retry attempt",
    {
      endpoint,
      nextAttempt: attempt + 2,
      delayMs,
      reason,
    },
    "warn"
  );

  await wait(delayMs);
}

function normalizeCacheSegment(value) {
  return String(value ?? "").trim().toLowerCase();
}

function createFlightSearchCacheKey({
  from,
  to,
  date,
  returnDate,
  tripType,
  adults,
  children,
  infants,
  cabinClass,
  sortBy,
  currency,
  countryCode,
  market,
  locale,
}) {
  return [
    normalizeCacheSegment(from),
    normalizeCacheSegment(to),
    normalizeCacheSegment(date),
    normalizeCacheSegment(returnDate),
    `tripType=${normalizeCacheSegment(tripType || "oneWay")}`,
    `adults=${normalizeCacheSegment(adults || 1)}`,
    `children=${normalizeCacheSegment(children || 0)}`,
    `infants=${normalizeCacheSegment(infants || 0)}`,
    `cabin=${normalizeCacheSegment(cabinClass || "economy")}`,
    `sort=${normalizeCacheSegment(sortBy || "best")}`,
    `currency=${normalizeCacheSegment(currency || "USD")}`,
    `country=${normalizeCacheSegment(countryCode || "US")}`,
    `market=${normalizeCacheSegment(market || "en-US")}`,
    `locale=${normalizeCacheSegment(locale || "en-US")}`,
  ].join("|");
}

function formatSkyScrapperDetails(message) {
  if (!message) {
    return "Sky Scrapper did not return any additional details.";
  }

  if (typeof message === "string") {
    return message;
  }

  if (message.action === "captcha") {
    return "Sky Scrapper blocked this route with a captcha challenge. Try again later.";
  }

  if (typeof message.message === "string") {
    return message.message;
  }

  return JSON.stringify(message);
}

function createBlockedError(message) {
  return createSkyScrapperError(
    429,
    "Too many requests. Please wait and try again.",
    message || "Sky Scrapper temporarily blocked this search.",
    PROVIDER_LIMITED_CODE
  );
}

function isProviderLimitedCode(code) {
  return code === PROVIDER_LIMITED_CODE || code === "BLOCKED_OR_CAPTCHA";
}

function createProviderUnavailableError(details = "Please try again in a moment.") {
  return createSkyScrapperError(
    502,
    "Flight provider is temporarily unavailable. Please try again in a moment.",
    details,
    "PROVIDER_UNAVAILABLE"
  );
}

function createUnknownProviderError(
  details = "Flight provider returned an unexpected response."
) {
  return createSkyScrapperError(
    502,
    "Flight provider returned an unexpected response. Please try again later.",
    details,
    "UNKNOWN_PROVIDER_ERROR"
  );
}

function getResultCount(payload) {
  if (Array.isArray(payload?.data)) {
    return payload.data.length;
  }

  if (Array.isArray(payload?.data?.itineraries)) {
    return payload.data.itineraries.length;
  }

  return 0;
}

function logSkyScrapperDiagnostic(label, details = {}, level = "warn") {
  logProviderDiagnostic("SkyScrapper", label, details, level);
}

function toResolvedPlace(place) {
  const flightParams = place?.navigation?.relevantFlightParams;
  const skyId = flightParams?.skyId || place?.skyId;
  const entityId = flightParams?.entityId || place?.entityId;

  if (!skyId || !entityId) {
    return null;
  }

  return {
    skyId,
    entityId,
    flightPlaceType:
      flightParams?.flightPlaceType ||
      place?.navigation?.entityType ||
      "UNKNOWN",
    localizedName:
      flightParams?.localizedName ||
      place?.navigation?.localizedName ||
      place?.presentation?.title ||
      "",
    title: place?.presentation?.title || "",
    suggestionTitle: place?.presentation?.suggestionTitle || "",
    subtitle: place?.presentation?.subtitle || "",
  };
}

function pickBestFlightPlace(query, places) {
  const resolvedPlaces = Array.isArray(places)
    ? places.map(toResolvedPlace).filter(Boolean)
    : [];

  if (resolvedPlaces.length === 0) {
    return null;
  }

  const normalizedQuery = normalizeText(query);
  const upperQuery = query.trim().toUpperCase();

  const exactSkyIdMatch = resolvedPlaces.find(
    (place) => place.skyId.toUpperCase() === upperQuery
  );

  if (exactSkyIdMatch) {
    return exactSkyIdMatch;
  }

  const exactDisplayCodeMatch = resolvedPlaces.find((place) =>
    place.suggestionTitle.toUpperCase().includes(`(${upperQuery})`)
  );

  if (exactDisplayCodeMatch) {
    return exactDisplayCodeMatch;
  }

  if (!looksLikeCode(query)) {
    const exactAirportMatch = resolvedPlaces.find(
      (place) =>
        place.flightPlaceType === "AIRPORT" &&
        normalizeText(place.title) === normalizedQuery
    );

    if (exactAirportMatch) {
      return exactAirportMatch;
    }

    const titlePrefixAirportMatch = resolvedPlaces.find(
      (place) =>
        place.flightPlaceType === "AIRPORT" &&
        normalizeText(place.title).startsWith(normalizedQuery)
    );

    if (titlePrefixAirportMatch) {
      return titlePrefixAirportMatch;
    }

    const exactCityMatch = resolvedPlaces.find(
      (place) =>
        place.flightPlaceType === "CITY" &&
        normalizeText(place.title) === normalizedQuery
    );

    if (exactCityMatch) {
      return exactCityMatch;
    }

    const titlePrefixCityMatch = resolvedPlaces.find(
      (place) =>
        place.flightPlaceType === "CITY" &&
        normalizeText(place.title).startsWith(normalizedQuery)
    );

    if (titlePrefixCityMatch) {
      return titlePrefixCityMatch;
    }
  }

  return (
    resolvedPlaces.find((place) => place.flightPlaceType === "AIRPORT") ||
    resolvedPlaces[0]
  );
}

function formatDuration(minutes) {
  const safeMinutes = Number.parseInt(minutes, 10);

  if (Number.isNaN(safeMinutes) || safeMinutes < 0) {
    return "Unknown";
  }

  const hours = Math.floor(safeMinutes / 60);
  const remainderMinutes = safeMinutes % 60;

  if (hours === 0) {
    return `${remainderMinutes}m`;
  }

  if (remainderMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainderMinutes}m`;
}

function buildFlightNumber(segment) {
  const carrierCode =
    segment?.marketingCarrier?.alternateId ||
    segment?.marketingCarrier?.displayCode ||
    "";
  const flightNumber = segment?.flightNumber || "";
  const composedNumber = `${carrierCode}${flightNumber}`.trim();

  return composedNumber || "Unknown flight";
}

function compactList(values) {
  return values.filter((value) => value !== undefined && value !== null && value !== "");
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function getDisplayName(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  return (
    value.name ||
    value.displayName ||
    value.displayCode ||
    value.id ||
    value.code ||
    ""
  );
}

function getCarrierCode(carrier) {
  return (
    carrier?.alternateId ||
    carrier?.displayCode ||
    carrier?.iata ||
    carrier?.iataCode ||
    carrier?.code ||
    carrier?.id ||
    ""
  );
}

function getCarrierLogoUrl(carrier) {
  const logo =
    carrier?.logoUrl ||
    carrier?.logo ||
    carrier?.imageUrl ||
    carrier?.iconUrl ||
    carrier?.image ||
    carrier?.logoImage;

  if (!logo) {
    return "";
  }

  if (typeof logo === "string") {
    return logo;
  }

  return logo.url || logo.src || logo.href || "";
}

function normalizeCarrier(carrier) {
  if (!carrier || typeof carrier !== "object") {
    return null;
  }

  const code = getCarrierCode(carrier);
  const name = getDisplayName(carrier) || code;
  const logoUrl = getCarrierLogoUrl(carrier);

  if (!code && !name && !logoUrl) {
    return null;
  }

  return {
    name,
    code,
    logoUrl,
  };
}

function uniqueCarriers(carriers) {
  const seen = new Set();

  return carriers.filter((carrier) => {
    if (!carrier) {
      return false;
    }

    const key = `${carrier.code || ""}:${carrier.name || ""}:${carrier.logoUrl || ""}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function normalizeAirport(airport) {
  if (!airport) {
    return {
      code: "",
      name: "",
    };
  }

  return {
    code:
      airport.displayCode ||
      airport.code ||
      airport.id ||
      airport.skyId ||
      airport.entityId ||
      "",
    name: getDisplayName(airport),
  };
}

function getAirportLabel(airport) {
  const normalizedAirport = normalizeAirport(airport);

  if (normalizedAirport.name && normalizedAirport.code) {
    return `${normalizedAirport.name} (${normalizedAirport.code})`;
  }

  return normalizedAirport.name || normalizedAirport.code;
}

function getAircraftName(segment) {
  return getDisplayName(segment?.aircraft) || segment?.aircraftName || "";
}

function getSafeProviderNotes(itinerary) {
  const tags = Array.isArray(itinerary?.tags) ? itinerary.tags : [];
  const notes = compactList([
    ...tags
      .map((tag) => (typeof tag === "string" ? tag : tag?.label || tag?.name || ""))
      .filter((tag) => !/score|provider|internal/i.test(tag))
      .slice(0, 4),
  ]);

  return notes.join(", ");
}

function formatLayoverDuration(arrival, nextDeparture) {
  const arrivalTime = Date.parse(arrival || "");
  const nextDepartureTime = Date.parse(nextDeparture || "");

  if (Number.isNaN(arrivalTime) || Number.isNaN(nextDepartureTime)) {
    return "";
  }

  const minutes = Math.round((nextDepartureTime - arrivalTime) / 60000);

  if (minutes <= 0) {
    return "";
  }

  return formatDuration(minutes);
}

function normalizeSegment(segment, index, segments) {
  const marketingCarrier = normalizeCarrier(segment?.marketingCarrier);
  const operatingCarrier = normalizeCarrier(segment?.operatingCarrier);
  const airline = marketingCarrier || operatingCarrier;
  const origin = normalizeAirport(segment?.origin);
  const destination = normalizeAirport(segment?.destination);
  const nextSegment = segments[index + 1];
  const layoverDuration = nextSegment
    ? formatLayoverDuration(segment?.arrival, nextSegment?.departure)
    : "";
  const layoverAirport = nextSegment
    ? getAirportLabel(segment?.destination || nextSegment?.origin)
    : "";

  return {
    originCode: origin.code,
    originAirport: origin.name,
    destinationCode: destination.code,
    destinationAirport: destination.name,
    airline: airline?.name || "",
    airlineCode: airline?.code || "",
    airlineLogo: airline?.logoUrl || "",
    operatingAirline: operatingCarrier?.name || "",
    operatingAirlineCode: operatingCarrier?.code || "",
    operatingAirlineLogo: operatingCarrier?.logoUrl || "",
    flightNumber: buildFlightNumber(segment),
    departure: segment?.departure || "",
    arrival: segment?.arrival || "",
    duration: formatDuration(segment?.durationInMinutes),
    aircraft: getAircraftName(segment),
    layoverAfter:
      layoverAirport || layoverDuration
        ? {
            airport: layoverAirport,
            duration: layoverDuration,
          }
        : null,
  };
}

function getBaggageSummary(itinerary, firstLeg) {
  const baggage =
    itinerary?.baggage ||
    itinerary?.baggageAllowance ||
    firstLeg?.baggage ||
    firstLeg?.baggageAllowance;

  if (!baggage) {
    return "";
  }

  if (typeof baggage === "string") {
    return baggage;
  }

  if (Array.isArray(baggage)) {
    return baggage
      .map((entry) => entry?.text || entry?.description || entry?.name || "")
      .filter(Boolean)
      .join(", ");
  }

  return baggage.text || baggage.description || baggage.name || "";
}

function normalizeFlights(payload, fallbackCurrencyCode = "USD") {
  const itineraries = payload?.data?.itineraries;

  if (!Array.isArray(itineraries)) {
    return [];
  }

  return itineraries
    .map((itinerary) => {
      const firstLeg = itinerary?.legs?.[0];
      const segments = Array.isArray(firstLeg?.segments) ? firstLeg.segments : [];
      const firstSegment = segments[0];
      const lastSegment = segments[segments.length - 1];
      const normalizedSegments = segments.map((segment, index) =>
        normalizeSegment(segment, index, segments)
      );
      const carriers = uniqueCarriers([
        ...asArray(firstLeg?.carriers?.marketing).map(normalizeCarrier),
        ...asArray(firstLeg?.carriers?.operating).map(normalizeCarrier),
        ...segments.map((segment) => normalizeCarrier(segment?.marketingCarrier)),
        ...segments.map((segment) => normalizeCarrier(segment?.operatingCarrier)),
      ]);
      const airline =
        carriers[0]?.name ||
        firstLeg?.carriers?.marketing?.[0]?.name ||
        firstSegment?.marketingCarrier?.name ||
        "Unknown airline";
      const price =
        typeof itinerary?.price?.raw === "number" ? itinerary.price.raw : null;

      if (!firstLeg || !firstSegment || price === null) {
        return null;
      }

      return {
        airline,
        airlineLogo: carriers[0]?.logoUrl || "",
        airlines: carriers,
        flightNumber: segments.map(buildFlightNumber).join(", "),
        departure: firstLeg?.departure || firstSegment?.departure || "",
        arrival: firstLeg?.arrival || lastSegment?.arrival || "",
        duration: formatDuration(firstLeg?.durationInMinutes),
        stops:
          typeof firstLeg?.stopCount === "number"
            ? firstLeg.stopCount
            : Math.max(segments.length - 1, 0),
        price,
        priceFormatted: itinerary?.price?.formatted || "",
        currency: fallbackCurrencyCode,
        bookingUrl: itinerary?.bookingUrl || itinerary?.deepLink || "",
        originCode:
          firstLeg?.origin?.displayCode || firstLeg?.origin?.id || "",
        destinationCode:
          firstLeg?.destination?.displayCode || firstLeg?.destination?.id || "",
        originAirport: getDisplayName(firstLeg?.origin),
        destinationAirport: getDisplayName(firstLeg?.destination),
        aircraft: compactList(segments.map(getAircraftName)).join(", "),
        baggage: getBaggageSummary(itinerary, firstLeg),
        providerNotes: getSafeProviderNotes(itinerary),
        segmentCount: segments.length,
        segments: normalizedSegments,
        layovers: compactList(normalizedSegments.map((segment) => segment.layoverAfter)),
        airports: compactList([
          getDisplayName(firstLeg?.origin),
          ...segments
            .slice(0, -1)
            .map((segment) => getDisplayName(segment?.destination)),
          getDisplayName(firstLeg?.destination),
        ]),
        routePath: compactList([
          normalizeAirport(firstLeg?.origin).code,
          ...normalizedSegments.map((segment) => segment.destinationCode),
        ]),
      };
    })
    .filter(Boolean)
    .filter((flight) => typeof flight.price === "number" && flight.price > 0);
}

function removeEmptyRequestParams(params) {
  return Object.entries(params).reduce((accumulator, [key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      accumulator[key] = value;
    }

    return accumulator;
  }, {});
}

async function searchAirport(query, locale = "en-US") {
  const cacheKey = `${locale}:${query.trim().toLowerCase()}`;
  const cachedPayload = getCachedValue(airportCache, cacheKey);

  if (cachedPayload) {
    return cachedPayload;
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const payload = await rapidApiGet({
        host: SKY_SCRAPPER_HOST,
        path: "/api/v1/flights/searchAirport",
        params: {
          query,
          locale,
        },
        timeout: 30000,
      });

      const blocked = isBlockedPayload(payload);
      const transient = isTransientPayload(payload);
      const html = isHtmlPayload(payload);
      const malformed =
        !payload || typeof payload !== "object" || Array.isArray(payload);
      logSkyScrapperDiagnostic(
        "searchAirport response",
        {
          endpoint: "searchAirport",
          query,
          locale,
          attempt: attempt + 1,
          status: payload?.status,
          blocked,
          transient,
          html,
          malformed,
          resultCount: getResultCount(payload),
          message: payload?.message,
          error: payload?.error,
        },
        payload?.status === false ? "warn" : "info"
      );

      if (blocked) {
        logSkyScrapperDiagnostic(
          "provider limited/blocked",
          {
            endpoint: "searchAirport",
            query,
            locale,
            status: payload?.status,
          },
          "warn"
        );

        throw createBlockedError(formatSkyScrapperDetails(payload?.message || payload));
      }

      if (html || malformed) {
        throw createProviderUnavailableError(
          html
            ? "Flight provider returned HTML instead of JSON."
            : "Flight provider returned malformed airport data."
        );
      }

      if (payload?.status === false) {
        if (transient) {
          if (attempt === 0) {
            await waitBeforeRetry("searchAirport", attempt, "transient payload");
            continue;
          }

          throw createProviderUnavailableError(
            formatSkyScrapperDetails(payload?.message || payload?.error)
          );
        }

        throw createProviderUnavailableError(
          formatSkyScrapperDetails(payload?.message || payload?.error)
        );
      }

      if (!Array.isArray(payload?.data)) {
        throw createProviderUnavailableError(
          "Flight provider returned malformed airport data."
        );
      }

      if (payload?.status !== false) {
        setCachedValue(airportCache, cacheKey, payload, AIRPORT_CACHE_TTL_MS);
      }

      return payload;
    } catch (error) {
      if (KNOWN_SKY_SCRAPPER_CODES.has(error?.code)) {
        throw error;
      }

      const blocked = isBlockedError(error);
      const transient = isTransientError(error);
      logSkyScrapperDiagnostic(
        "searchAirport error",
        {
          endpoint: "searchAirport",
          query,
          locale,
          attempt: attempt + 1,
          status: error?.response?.status,
          blocked,
          transient,
          message: error?.response?.data?.message || error?.message,
          error: error?.response?.data?.error,
        },
        "error"
      );

      if (blocked) {
        logSkyScrapperDiagnostic(
          "provider limited/blocked",
          {
            endpoint: "searchAirport",
            query,
            locale,
            status: error?.response?.status,
          },
          "warn"
        );

        throw createBlockedError(
          formatSkyScrapperDetails(error?.response?.data?.message || error?.message)
        );
      }

      if (transient) {
        if (attempt === 0) {
          await waitBeforeRetry("searchAirport", attempt, "transient error");
          continue;
        }

        throw createProviderUnavailableError(
          formatSkyScrapperDetails(error?.response?.data?.message || error?.message)
        );
      }

      throw createUnknownProviderError(
        formatSkyScrapperDetails(error?.response?.data?.message || error?.message)
      );
    }
  }

  throw createProviderUnavailableError();
}

async function resolveFlightPlace(query, locale = "en-US") {
  const payload = await searchAirport(query, locale);

  if (payload?.status === false) {
    throw createProviderUnavailableError(
      formatSkyScrapperDetails(payload?.message || payload?.error)
    );
  }

  const bestMatch = pickBestFlightPlace(query, payload?.data);

  if (!bestMatch) {
    logSkyScrapperDiagnostic("searchAirport no match", {
      endpoint: "searchAirport",
      query,
      locale,
      resultCount: getResultCount(payload),
    });

    throw createValidationError(
      "Invalid flight route",
      `Could not find a supported airport or city for "${query}".`
    );
  }

  return bestMatch;
}

async function fetchFlightsWithRetry(params) {
  const requestParams = removeEmptyRequestParams(params);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const payload = await rapidApiGet({
        host: SKY_SCRAPPER_HOST,
        path: "/api/v1/flights/searchFlights",
        params: requestParams,
        timeout: 30000,
      });

      const blocked = isBlockedPayload(payload);
      const transient = isTransientPayload(payload);
      const html = isHtmlPayload(payload);
      const malformed =
        !payload || typeof payload !== "object" || Array.isArray(payload);
      logSkyScrapperDiagnostic(
        "searchFlights response",
        {
          endpoint: "searchFlights",
          params: requestParams,
          attempt: attempt + 1,
          status: payload?.status,
          blocked,
          transient,
          html,
          malformed,
          resultCount: getResultCount(payload),
          message: payload?.message,
          error: payload?.error,
        },
        payload?.status === false ? "warn" : "info"
      );

      if (blocked) {
        logSkyScrapperDiagnostic(
          "provider limited/blocked",
          {
            endpoint: "searchFlights",
            status: payload?.status,
          },
          "warn"
        );

        throw createBlockedError(formatSkyScrapperDetails(payload?.message || payload));
      }

      if (html || malformed) {
        throw createUnknownProviderError(
          html
            ? "Flight provider returned HTML instead of JSON."
            : "Flight provider returned malformed data."
        );
      }

      if (payload?.status === false) {
        if (transient) {
          if (attempt === 0) {
            await waitBeforeRetry("searchFlights", attempt, "transient payload");
            continue;
          }

          throw createProviderUnavailableError(
            formatSkyScrapperDetails(payload?.message || payload?.error)
          );
        }

        throw createProviderUnavailableError(
          formatSkyScrapperDetails(payload?.message || payload?.error)
        );
      }

      if (Array.isArray(payload?.data?.itineraries)) {
        return payload;
      }

      throw createUnknownProviderError("Flight provider returned malformed flight data.");
    } catch (error) {
      if (KNOWN_SKY_SCRAPPER_CODES.has(error?.code)) {
        throw error;
      }

      const blocked = isBlockedError(error);
      const transient = isTransientError(error);
      logSkyScrapperDiagnostic(
        "searchFlights error",
        {
          endpoint: "searchFlights",
          params: requestParams,
          attempt: attempt + 1,
          status: error?.response?.status,
          blocked,
          transient,
          message: error?.response?.data?.message || error?.message,
          error: error?.response?.data?.error,
        },
        "error"
      );

      if (blocked) {
        logSkyScrapperDiagnostic(
          "provider limited/blocked",
          {
            endpoint: "searchFlights",
            status: error?.response?.status,
          },
          "warn"
        );

        throw createBlockedError(
          formatSkyScrapperDetails(error?.response?.data?.message || error?.message)
        );
      }

      if (transient) {
        if (attempt === 0) {
          await waitBeforeRetry("searchFlights", attempt, "transient error");
          continue;
        }

        throw createProviderUnavailableError(
          formatSkyScrapperDetails(error?.response?.data?.message || error?.message)
        );
      }

      throw createUnknownProviderError(
        formatSkyScrapperDetails(error?.response?.data?.message || error?.message)
      );
    }
  }

  throw createProviderUnavailableError();
}

async function searchFlights({
  from,
  to,
  date,
  returnDate,
  tripType = returnDate ? "roundTrip" : "oneWay",
  adults = 1,
  children = 0,
  infants = 0,
  cabinClass = "economy",
  sortBy = "best",
  currency = "USD",
  countryCode = "US",
  market = "en-US",
  locale = "en-US",
}) {
  const cacheKey = createFlightSearchCacheKey({
    from,
    to,
    date,
    returnDate,
    tripType,
    adults,
    children,
    infants,
    cabinClass,
    sortBy,
    currency,
    countryCode,
    market,
    locale,
  });
  const cachedResult = getCachedValue(flightCache, cacheKey);

  if (cachedResult) {
    logSkyScrapperDiagnostic(
      "flight cache hit",
      {
        searchKey: cacheKey,
        cacheType: "success",
      },
      "info"
    );

    return {
      ...cachedResult,
      meta: {
        ...cachedResult.meta,
        cached: true,
      },
    };
  }

  const cachedNegativeResult = getCachedValue(flightNegativeCache, cacheKey);

  if (cachedNegativeResult) {
    logSkyScrapperDiagnostic(
      "flight cache hit",
      {
        searchKey: cacheKey,
        cacheType: "provider-limited",
      },
      "warn"
    );

    throw restoreSkyScrapperError(cachedNegativeResult);
  }

  const existingRequest = inFlightFlightRequests.get(cacheKey);

  if (existingRequest) {
    logSkyScrapperDiagnostic(
      "flight request deduped",
      {
        searchKey: cacheKey,
      },
      "info"
    );

    return existingRequest;
  }

  logSkyScrapperDiagnostic(
    "flight cache miss",
    {
      searchKey: cacheKey,
    },
    "info"
  );

  const searchPromise = (async () => {
    const [origin, destination] = await Promise.all([
      resolveFlightPlace(from, locale),
      resolveFlightPlace(to, locale),
    ]);

    if (
      origin.skyId === destination.skyId &&
      origin.entityId === destination.entityId
    ) {
      throw createValidationError(
        "Invalid flight route",
        "Origin and destination must be different."
      );
    }

    const payload = await fetchFlightsWithRetry({
      originSkyId: origin.skyId,
      destinationSkyId: destination.skyId,
      originEntityId: origin.entityId,
      destinationEntityId: destination.entityId,
      date,
      returnDate,
      adults,
      cabinClass,
      sortBy,
      currency,
      countryCode,
      market,
    });

    const result = {
      payload,
      origin,
      destination,
      meta: {
        cached: false,
      },
    };

    if (Array.isArray(payload?.data?.itineraries)) {
      setCachedValue(flightCache, cacheKey, result, FLIGHT_CACHE_TTL_MS);
      logSkyScrapperDiagnostic(
        "flight cache stored",
        {
          searchKey: cacheKey,
          ttlMs: FLIGHT_CACHE_TTL_MS,
          resultCount: getResultCount(payload),
        },
        "info"
      );
    }

    return result;
  })().catch((error) => {
    if (isProviderLimitedCode(error?.code)) {
      setCachedValue(
        flightNegativeCache,
        cacheKey,
        snapshotSkyScrapperError(error),
        FLIGHT_NEGATIVE_CACHE_TTL_MS
      );
      logSkyScrapperDiagnostic(
        "flight negative cache stored",
        {
          searchKey: cacheKey,
          ttlMs: FLIGHT_NEGATIVE_CACHE_TTL_MS,
          code: PROVIDER_LIMITED_CODE,
        },
        "warn"
      );
    }

    throw error;
  });

  inFlightFlightRequests.set(cacheKey, searchPromise);

  try {
    return await searchPromise;
  } finally {
    inFlightFlightRequests.delete(cacheKey);
  }
}

module.exports = {
  formatSkyScrapperDetails,
  normalizeFlights,
  searchFlights,
};
