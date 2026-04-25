const { SKY_SCRAPPER_HOST } = require("../config/env");
const { rapidApiGet } = require("./rapidapi");
const { logProviderDiagnostic } = require("../utils/providerDiagnostics");

const AIRPORT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const FLIGHT_CACHE_TTL_MS = 5 * 60 * 1000;
const RETRY_DELAY_MIN_MS = 2000;
const RETRY_DELAY_MAX_MS = 3000;

const airportCache = new Map();
const flightCache = new Map();
const inFlightFlightRequests = new Map();
const KNOWN_SKY_SCRAPPER_CODES = new Set([
  "BLOCKED_OR_CAPTCHA",
  "PROVIDER_UNAVAILABLE",
  "UNKNOWN_PROVIDER_ERROR",
  "VALIDATION_ERROR",
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
    normalizedValue.includes("too many requests") ||
    normalizedValue.includes("rate limit") ||
    normalizedValue.includes("temporarily blocked") ||
    normalizedValue.includes("request blocked") ||
    normalizedValue.includes("access denied") ||
    normalizedValue.includes("perimeterx") ||
    /\bblocked\b/.test(normalizedValue) ||
    normalizedValue.includes("bot challenge") ||
    normalizedValue.includes("captcha") ||
    normalizedValue.includes("rate limit")
  );
}

function isBlockedPayload(payload) {
  return isBlockedMessage(payload?.message) || isBlockedMessage(payload?.error);
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

  if (error?.code === "ECONNABORTED" || statusCode === 502 || statusCode === 503) {
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

function createFlightSearchCacheKey(from, to, date) {
  return [normalizeText(from), normalizeText(to), date?.trim() || ""].join(":");
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
    "BLOCKED_OR_CAPTCHA"
  );
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
      const airline =
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
      };
    })
    .filter(Boolean)
    .filter((flight) => typeof flight.price === "number" && flight.price > 0);
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
          resultCount: getResultCount(payload),
          message: payload?.message,
          error: payload?.error,
        },
        payload?.status === false ? "warn" : "info"
      );

      if (payload?.status === false) {
        if (blocked) {
          if (attempt === 0) {
            await wait(getRetryDelayMs());
            continue;
          }

          throw createBlockedError(formatSkyScrapperDetails(payload?.message));
        }

        if (transient) {
          if (attempt === 0) {
            await wait(getRetryDelayMs());
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

      if (payload?.status !== false) {
        setCachedValue(airportCache, cacheKey, payload, AIRPORT_CACHE_TTL_MS);
      }

      return payload;
    } catch (error) {
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

      if (isBlockedError(error)) {
        if (attempt === 0) {
          await wait(getRetryDelayMs());
          continue;
        }

        throw createBlockedError(
          formatSkyScrapperDetails(error?.response?.data?.message || error?.message)
        );
      }

      if (isTransientError(error)) {
        if (attempt === 0) {
          await wait(getRetryDelayMs());
          continue;
        }

        throw createProviderUnavailableError(
          formatSkyScrapperDetails(error?.response?.data?.message || error?.message)
        );
      }

      if (KNOWN_SKY_SCRAPPER_CODES.has(error?.code)) {
        throw error;
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
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const payload = await rapidApiGet({
        host: SKY_SCRAPPER_HOST,
        path: "/api/v1/flights/searchFlights",
        params,
        timeout: 30000,
      });

      const blocked = isBlockedPayload(payload);
      const transient = isTransientPayload(payload);
      logSkyScrapperDiagnostic(
        "searchFlights response",
        {
          endpoint: "searchFlights",
          params,
          attempt: attempt + 1,
          status: payload?.status,
          blocked,
          transient,
          resultCount: getResultCount(payload),
          message: payload?.message,
          error: payload?.error,
        },
        payload?.status === false ? "warn" : "info"
      );

      if (payload?.status === false) {
        if (blocked) {
          if (attempt === 0) {
            await wait(getRetryDelayMs());
            continue;
          }

          throw createBlockedError(formatSkyScrapperDetails(payload?.message));
        }

        if (transient) {
          if (attempt === 0) {
            await wait(getRetryDelayMs());
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

      if (payload?.status !== undefined || payload?.data) {
        return payload;
      }

      throw createUnknownProviderError("Flight provider returned an unreadable payload.");
    } catch (error) {
      const blocked = isBlockedError(error);
      const transient = isTransientError(error);
      logSkyScrapperDiagnostic(
        "searchFlights error",
        {
          endpoint: "searchFlights",
          params,
          attempt: attempt + 1,
          status: error?.response?.status,
          blocked,
          transient,
          message: error?.response?.data?.message || error?.message,
          error: error?.response?.data?.error,
        },
        "error"
      );

      if (!blocked) {
        if (transient) {
          if (attempt === 0) {
            await wait(getRetryDelayMs());
            continue;
          }

          throw createProviderUnavailableError(
            formatSkyScrapperDetails(error?.response?.data?.message || error?.message)
          );
        }

        if (KNOWN_SKY_SCRAPPER_CODES.has(error?.code)) {
          throw error;
        }

        throw createUnknownProviderError(
          formatSkyScrapperDetails(error?.response?.data?.message || error?.message)
        );
      }

      if (attempt === 0) {
        await wait(getRetryDelayMs());
        continue;
      }

      throw createBlockedError(
        formatSkyScrapperDetails(error?.response?.data?.message || error?.message)
      );
    }
  }

  throw createBlockedError("Sky Scrapper temporarily blocked this search.");
}

async function searchFlights({
  from,
  to,
  date,
  adults = 1,
  cabinClass = "economy",
  sortBy = "best",
  currency = "USD",
  countryCode = "US",
  market = "en-US",
  locale = "en-US",
}) {
  const cacheKey = createFlightSearchCacheKey(from, to, date);
  const cachedResult = getCachedValue(flightCache, cacheKey);

  if (cachedResult) {
    return {
      ...cachedResult,
      meta: {
        cached: true,
      },
    };
  }

  const existingRequest = inFlightFlightRequests.get(cacheKey);

  if (existingRequest) {
    return existingRequest;
  }

  const searchPromise = (async () => {
    const [origin, destination] = await Promise.all([
      resolveFlightPlace(from, locale),
      resolveFlightPlace(to, locale),
    ]);

    const payload = await fetchFlightsWithRetry({
      originSkyId: origin.skyId,
      destinationSkyId: destination.skyId,
      originEntityId: origin.entityId,
      destinationEntityId: destination.entityId,
      date,
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

    if (payload?.status === true) {
      setCachedValue(flightCache, cacheKey, result, FLIGHT_CACHE_TTL_MS);
    }

    return result;
  })();

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
