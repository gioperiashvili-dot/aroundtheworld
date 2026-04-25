const { TRIPADVISOR_HOST } = require("../config/env");
const { rapidApiGet } = require("./rapidapi");
const { logProviderDiagnostic } = require("../utils/providerDiagnostics");

const LOCATION_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const locationCache = new Map();
const TRIPADVISOR_WEB_ORIGIN = "https://www.tripadvisor.com";
const DEFAULT_IMAGE_WIDTH = 900;
const KNOWN_TRIPADVISOR_CODES = new Set([
  "PROVIDER_UNAVAILABLE",
  "LOCATION_NOT_FOUND",
  "VALIDATION_ERROR",
  "MISSING_API_KEY",
]);

function createTripadvisorError(statusCode, error, details, code) {
  const requestError = new Error(error);
  requestError.statusCode = statusCode;
  requestError.details = details;
  requestError.code = code;
  return requestError;
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

function stripMarkup(value = "") {
  return value.replace(/<[^>]*>/g, "").trim();
}

function normalizeText(value) {
  return stripMarkup(value).toLowerCase();
}

function normalizeExternalImageUrl(value, baseUrl = TRIPADVISOR_WEB_ORIGIN) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  try {
    const normalizedUrl = new URL(value.trim(), baseUrl);

    if (!["http:", "https:"].includes(normalizedUrl.protocol)) {
      return null;
    }

    const isTripadvisorMedia = normalizedUrl.hostname.includes("tripadvisor.com");

    if (isTripadvisorMedia) {
      const widthParam = normalizedUrl.searchParams.get("w");
      const heightParam = normalizedUrl.searchParams.get("h");

      if (widthParam) {
        normalizedUrl.searchParams.delete("h");
      } else if (heightParam) {
        normalizedUrl.searchParams.set("w", heightParam);
        normalizedUrl.searchParams.delete("h");
      }
    }

    return normalizedUrl.toString();
  } catch (_error) {
    return null;
  }
}

function clampDimension(preferredValue, maximumValue) {
  const preferred = Number.parseInt(preferredValue, 10);
  const maximum = Number.parseInt(maximumValue, 10);

  if (!Number.isFinite(preferred) || preferred < 1) {
    return 1;
  }

  if (!Number.isFinite(maximum) || maximum < 1) {
    return preferred;
  }

  return Math.min(preferred, maximum);
}

function buildImageUrlFromTemplate(photoSize, preferredWidth) {
  const urlTemplate = photoSize?.urlTemplate;

  if (!urlTemplate) {
    return null;
  }

  const width = clampDimension(preferredWidth, photoSize?.maxWidth);
  const resolvedUrl = urlTemplate
    .replace("{width}", String(width))
    .replace("{height}", String(width));

  return normalizeExternalImageUrl(resolvedUrl);
}

function collectImageCandidates(source, depth = 0) {
  if (!source || depth > 4) {
    return [];
  }

  if (typeof source === "string") {
    const normalizedUrl = normalizeExternalImageUrl(source);
    return normalizedUrl ? [normalizedUrl] : [];
  }

  if (Array.isArray(source)) {
    return Array.from(
      new Set(
        source
          .slice(0, 8)
          .flatMap((item) => collectImageCandidates(item, depth + 1))
      )
    );
  }

  if (typeof source !== "object") {
    return [];
  }

  const candidates = [];
  const templateUrl = buildImageUrlFromTemplate(
    source,
    DEFAULT_IMAGE_WIDTH
  );

  if (templateUrl) {
    candidates.push(templateUrl);
  }

  [
    source.url,
    source.src,
    source.imageUrl,
    source.image_url,
    source.heroImgUrl,
    source.squareImgUrl,
    source.thumbnailUrl,
    source.largeUrl,
    source.mediumUrl,
    source.smallUrl,
    source.displayUrl,
  ].forEach((value) => {
    const normalizedUrl = normalizeExternalImageUrl(value);

    if (normalizedUrl) {
      candidates.push(normalizedUrl);
    }
  });

  [
    source.sizes,
    source.size,
    source.photo,
    source.photoSizeDynamic,
    source.thumbnail,
    source.image,
    source.images,
    source.media,
    source.cardPhotos,
    source.photos,
    source.photoGallery,
    source.large,
    source.medium,
    source.small,
  ].forEach((value) => {
    candidates.push(...collectImageCandidates(value, depth + 1));
  });

  return Array.from(new Set(candidates));
}

function getFirstImageCandidate(...sources) {
  for (const source of sources) {
    const candidate = collectImageCandidates(source)[0];

    if (candidate) {
      return candidate;
    }
  }

  return null;
}

function countImages(items = []) {
  return items.filter((item) => Boolean(item?.image)).length;
}

function logTripadvisorDiagnostic(label, details = {}, level = "warn") {
  logProviderDiagnostic("Tripadvisor", label, details, level);
}

function mapTripadvisorProviderFailure(message, code = "PROVIDER_UNAVAILABLE", statusCode = 502) {
  return createTripadvisorError(
    statusCode,
    "Tripadvisor service is temporarily unavailable. Please try again later.",
    message || "Please try again in a moment.",
    code
  );
}

function mapTripadvisorRequestError(error, fallbackDetails) {
  if (KNOWN_TRIPADVISOR_CODES.has(error?.code)) {
    return error;
  }

  if (typeof error?.message === "string") {
    if (error.message.includes("RAPIDAPI_KEY")) {
      return createTripadvisorError(
        500,
        "Tripadvisor API key is missing.",
        "Set RAPIDAPI_KEY before searching Tripadvisor content.",
        "MISSING_API_KEY"
      );
    }

    if (
      error.message.toLowerCase().includes("timeout") ||
      error.message.toLowerCase().includes("timed out")
    ) {
      return mapTripadvisorProviderFailure(
        fallbackDetails || "Tripadvisor timed out while processing this request."
      );
    }
  }

  return mapTripadvisorProviderFailure(
    fallbackDetails || "Tripadvisor could not complete this request."
  );
}

function pickBestLocation(query, locations) {
  if (!Array.isArray(locations) || locations.length === 0) {
    return null;
  }

  const normalizedQuery = normalizeText(query);

  const exactCityMatch = locations.find(
    (location) =>
      location?.trackingItems === "CITY" &&
      normalizeText(location?.title) === normalizedQuery
  );

  if (exactCityMatch) {
    return exactCityMatch;
  }

  const prefixCityMatch = locations.find(
    (location) =>
      location?.trackingItems === "CITY" &&
      normalizeText(location?.title).startsWith(normalizedQuery)
  );

  if (prefixCityMatch) {
    return prefixCityMatch;
  }

  return locations[0];
}

function getHotelImage(hotel) {
  return getFirstImageCandidate(
    hotel?.cardPhotos,
    hotel?.photos,
    hotel?.thumbnail,
    hotel?.image,
    hotel?.media,
    hotel?.heroImgUrl,
    hotel?.squareImgUrl,
    hotel?.photo
  );
}

function getRestaurantImage(restaurant) {
  return getFirstImageCandidate(
    restaurant?.thumbnail,
    restaurant?.photo,
    restaurant?.photoGallery,
    restaurant?.cardPhotos,
    restaurant?.image,
    restaurant?.images,
    restaurant?.media,
    restaurant?.heroImgUrl,
    restaurant?.squareImgUrl
  );
}

function getBestPurchaseLink(purchaseLinks = []) {
  return purchaseLinks.reduce((bestLink, currentLink) => {
    const bestPrice = bestLink?.totalPrice ?? Number.POSITIVE_INFINITY;
    const currentPrice = currentLink?.totalPrice ?? Number.POSITIVE_INFINITY;

    if (currentPrice > 0 && currentPrice < bestPrice) {
      return currentLink;
    }

    return bestLink;
  }, null);
}

function formatDuration(departure, arrival) {
  const departureTime = Date.parse(departure);
  const arrivalTime = Date.parse(arrival);

  if (Number.isNaN(departureTime) || Number.isNaN(arrivalTime)) {
    return "Unknown";
  }

  const totalMinutes = Math.max(Math.round((arrivalTime - departureTime) / 60000), 0);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

function normalizeTripAdvisorFlights(payload, fallbackCurrencyCode = "USD") {
  const flights = payload?.data?.flights;

  if (!Array.isArray(flights)) {
    return [];
  }

  return flights
    .map((flight) => {
      const firstSegment = flight?.segments?.[0];
      const legs = Array.isArray(firstSegment?.legs) ? firstSegment.legs : [];
      const firstLeg = legs[0];
      const lastLeg = legs[legs.length - 1];
      const bestPurchaseLink = getBestPurchaseLink(flight?.purchaseLinks);

      if (!firstLeg || !lastLeg || !bestPurchaseLink) {
        return null;
      }

      const airline =
        firstLeg?.marketingCarrier?.displayName ||
        firstLeg?.operatingCarrier?.displayName ||
        "Unknown airline";
      const marketingCarrierCode = firstLeg?.marketingCarrierCode || "";
      const flightNumber = firstLeg?.flightNumber || "";

      return {
        airline,
        flightNumber: `${marketingCarrierCode}${flightNumber}`.trim(),
        departure: firstLeg?.departureDateTime || "",
        arrival: lastLeg?.arrivalDateTime || "",
        duration: formatDuration(
          firstLeg?.departureDateTime || "",
          lastLeg?.arrivalDateTime || ""
        ),
        stops: Math.max(legs.length - 1, 0),
        price: bestPurchaseLink?.totalPrice ?? null,
        currency:
          bestPurchaseLink?.currency ||
          payload?.data?.currencyCode ||
          fallbackCurrencyCode,
        bookingUrl: bestPurchaseLink?.url || "",
      };
    })
    .filter(Boolean)
    .filter((flight) => typeof flight.price === "number" && flight.price > 0);
}

function normalizeHotels(payload) {
  const hotels = payload?.data?.data;

  if (!Array.isArray(hotels)) {
    return [];
  }

  return hotels.map((hotel) => ({
    id: hotel?.id || "",
    name: stripMarkup(hotel?.title || "").replace(/^\d+\.\s*/, ""),
    area: hotel?.secondaryInfo || hotel?.primaryInfo || "",
    address: hotel?.secondaryInfo || hotel?.primaryInfo || "",
    price:
      hotel?.priceForDisplay ||
      hotel?.commerceInfo?.priceForDisplay?.text ||
      hotel?.priceSummary ||
      "Check provider",
    rating:
      typeof hotel?.bubbleRating?.rating === "number"
        ? hotel.bubbleRating.rating
        : null,
    reviews: hotel?.bubbleRating?.count || "",
    reviewCount: hotel?.bubbleRating?.count || "",
    provider: hotel?.provider || hotel?.commerceInfo?.provider || "",
    bookingUrl: hotel?.commerceInfo?.externalUrl || "",
    image: getHotelImage(hotel),
    priceDetails:
      hotel?.priceDetails || hotel?.commerceInfo?.details?.text || "",
    summary:
      hotel?.priceSummary || hotel?.commerceInfo?.commerceSummary?.text || "",
  }));
}

function normalizeRestaurants(payload) {
  const restaurants = payload?.data?.data;

  if (!Array.isArray(restaurants)) {
    return [];
  }

  return restaurants.map((restaurant) => ({
    id: restaurant?.locationId || restaurant?.restaurantsId || "",
    name: restaurant?.name || "Unnamed restaurant",
    rating:
      typeof restaurant?.averageRating === "number"
        ? restaurant.averageRating
        : null,
    reviews:
      typeof restaurant?.userReviewCount === "number"
        ? restaurant.userReviewCount
        : null,
    reviewCount:
      typeof restaurant?.userReviewCount === "number"
        ? restaurant.userReviewCount
        : null,
    cuisine:
      Array.isArray(restaurant?.establishmentTypeAndCuisineTags) &&
      restaurant.establishmentTypeAndCuisineTags.length > 0
        ? restaurant.establishmentTypeAndCuisineTags.slice(0, 3).join(", ")
        : "Various",
    priceTag: restaurant?.priceTag || "",
    openStatus: restaurant?.currentOpenStatusText || "",
    city: restaurant?.parentGeoName || "",
    address:
      restaurant?.streetAddress ||
      restaurant?.formattedAddress ||
      restaurant?.parentGeoName ||
      "",
    menuUrl: restaurant?.menuUrl || "",
    image: getRestaurantImage(restaurant),
  }));
}

async function searchLocation(query) {
  const cacheKey = normalizeText(query);
  const cachedPayload = getCachedValue(locationCache, cacheKey);

  if (cachedPayload) {
    return cachedPayload;
  }

  try {
    const payload = await rapidApiGet({
      host: TRIPADVISOR_HOST,
      path: "/api/v1/hotels/searchLocation",
      params: {
        query,
      },
      timeout: 15000,
    });

    logTripadvisorDiagnostic(
      "searchLocation response",
      {
        endpoint: "hotels/searchLocation",
        query,
        status: payload?.status,
        resultCount: Array.isArray(payload?.data) ? payload.data.length : 0,
        message: payload?.message,
        error: payload?.error,
      },
      payload?.status === false ? "warn" : "info"
    );

    if (payload?.status === true) {
      setCachedValue(locationCache, cacheKey, payload, LOCATION_CACHE_TTL_MS);
    }

    return payload;
  } catch (error) {
    logTripadvisorDiagnostic(
      "searchLocation error",
      {
        endpoint: "hotels/searchLocation",
        query,
        status: error?.response?.status,
        message: error?.response?.data?.message || error?.message,
        error: error?.response?.data?.error,
      },
      "error"
    );

    throw mapTripadvisorRequestError(
      error,
      "Tripadvisor could not resolve that destination right now."
    );
  }
}

async function resolveLocation(query) {
  const payload = await searchLocation(query);

  if (payload?.status === false) {
    throw createTripadvisorError(
      502,
      "Tripadvisor service is temporarily unavailable. Please try again later.",
      "Tripadvisor could not resolve that destination.",
      "PROVIDER_UNAVAILABLE"
    );
  }

  const bestMatch = pickBestLocation(query, payload?.data);

  if (!bestMatch?.geoId) {
    throw createTripadvisorError(
      404,
      "We could not find that destination.",
      `Could not find a supported city for "${query}".`,
      "LOCATION_NOT_FOUND"
    );
  }

  logTripadvisorDiagnostic("searchLocation resolved", {
    query,
    geoId: bestMatch.geoId,
    title: bestMatch.title,
    type: bestMatch.trackingItems,
  });

  return {
    geoId: bestMatch.geoId,
    title: stripMarkup(bestMatch.title || ""),
    subtitle: bestMatch.secondaryText || "",
    type: bestMatch.trackingItems || "",
    documentId: bestMatch.documentId || "",
  };
}

async function searchTripAdvisorFlights(params) {
  return rapidApiGet({
    host: TRIPADVISOR_HOST,
    path: "/api/v1/flights/searchFlights",
    params,
    timeout: 15000,
  });
}

async function searchHotels({
  city,
  checkIn,
  checkOut,
  rooms = 1,
  adults = 2,
  currencyCode = "USD",
}) {
  const location = await resolveLocation(city);
  try {
    const payload = await rapidApiGet({
      host: TRIPADVISOR_HOST,
      path: "/api/v1/hotels/searchHotels",
      params: {
        geoId: location.geoId,
        checkIn,
        checkOut,
        rooms,
        adults,
        currencyCode,
      },
      timeout: 20000,
    });

    const hotels = normalizeHotels(payload);
    logTripadvisorDiagnostic(
      "searchHotels response",
      {
        endpoint: "hotels/searchHotels",
        city,
        checkIn,
        checkOut,
        geoId: location.geoId,
        status: payload?.status,
        providerCount: Array.isArray(payload?.data?.data) ? payload.data.data.length : 0,
        normalizedCount: hotels.length,
        imageCount: countImages(hotels),
        message: payload?.message,
        error: payload?.error,
      },
      payload?.status === false ? "warn" : "info"
    );

    if (payload?.status === false) {
      throw mapTripadvisorProviderFailure(
        "Tripadvisor could not return hotels right now."
      );
    }

    return {
      location,
      payload,
      hotels,
    };
  } catch (error) {
    logTripadvisorDiagnostic(
      "searchHotels error",
      {
        endpoint: "hotels/searchHotels",
        city,
        checkIn,
        checkOut,
        geoId: location.geoId,
        status: error?.response?.status,
        message: error?.response?.data?.message || error?.message,
        error: error?.response?.data?.error,
      },
      "error"
    );

    throw mapTripadvisorRequestError(
      error,
      "Tripadvisor could not return hotels right now."
    );
  }
}

async function searchRestaurants({ city, page = 1 }) {
  const location = await resolveLocation(city);
  try {
    const payload = await rapidApiGet({
      host: TRIPADVISOR_HOST,
      path: "/api/v1/restaurant/searchRestaurants",
      params: {
        locationId: location.geoId,
        page,
      },
      timeout: 20000,
    });

    const restaurants = normalizeRestaurants(payload);
    logTripadvisorDiagnostic(
      "searchRestaurants response",
      {
        endpoint: "restaurant/searchRestaurants",
        city,
        page,
        locationId: location.geoId,
        status: payload?.status,
        providerCount: Array.isArray(payload?.data?.data) ? payload.data.data.length : 0,
        normalizedCount: restaurants.length,
        imageCount: countImages(restaurants),
        message: payload?.message,
        error: payload?.error,
      },
      payload?.status === false ? "warn" : "info"
    );

    if (payload?.status === false) {
      throw mapTripadvisorProviderFailure(
        "Tripadvisor could not return restaurants right now."
      );
    }

    return {
      location,
      payload,
      restaurants,
    };
  } catch (error) {
    logTripadvisorDiagnostic(
      "searchRestaurants error",
      {
        endpoint: "restaurant/searchRestaurants",
        city,
        page,
        locationId: location.geoId,
        status: error?.response?.status,
        message: error?.response?.data?.message || error?.message,
        error: error?.response?.data?.error,
      },
      "error"
    );

    throw mapTripadvisorRequestError(
      error,
      "Tripadvisor could not return restaurants right now."
    );
  }
}

module.exports = {
  normalizeHotels,
  normalizeRestaurants,
  normalizeTripAdvisorFlights,
  searchHotels,
  searchLocation,
  searchRestaurants,
  searchTripAdvisorFlights,
};
