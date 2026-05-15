const express = require("express");
const router = express.Router();
const {
  fetchPriceCalendar,
  normalizeFlights,
  PRICE_CALENDAR_PATH,
  searchFlights,
} = require("../services/skyScrapper");
const { SKY_SCRAPPER_HOST } = require("../config/env");
const {
  MAX_BOOKING_REQUEST_BYTES,
  sendFlightBookingRequestEmail,
} = require("../services/flightBookingEmail");
const {
  buildErrorResponse,
  buildSuccessResponse,
} = require("../utils/apiResponses");
const { logProviderDiagnostic } = require("../utils/providerDiagnostics");

const FLIGHT_MESSAGES = {
  providerLimited:
    "ფრენების სერვისი დროებით გადატვირთულია. გთხოვთ სცადოთ რამდენიმე წუთში.",
  validation: "გთხოვთ გადაამოწმოთ მიმართულება და თარიღი.",
  multiCityUnsupported:
    "Multi-city flight search is coming soon. Please use one-way or round-trip search for now.",
  noResults:
    "ამ მიმართულებაზე ფრენები ვერ მოიძებნა. სცადეთ სხვა თარიღი ან მიმართულება.",
  providerUnavailable:
    "ფრენების სერვისი დროებით მიუწვდომელია. გთხოვთ სცადოთ ცოტა ხანში.",
};

const BOOKING_REQUEST_MESSAGES = {
  sent:
    "Your request has been sent successfully. Our operator will contact you soon.",
  validation: "Please provide your name, email, phone, and selected flight.",
  emailNotConfigured: "Flight booking email is not configured.",
  sendFailed:
    "We could not send your booking request right now. Please try again later.",
  payloadTooLarge: "Booking request payload is too large.",
};

const SUPPORTED_CABINS = new Set([
  "economy",
  "premium_economy",
  "business",
  "first",
]);
const SUPPORTED_TRIP_TYPES = new Set(["oneWay", "roundTrip", "multiCity"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function logFlightDiagnostic(label, details = {}, level = "info") {
  logProviderDiagnostic("Flights", label, details, level);
}

function parseCount(value, fallbackValue, minimumValue = 0) {
  if (value === undefined || value === null || value === "") {
    return fallbackValue;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || String(value).trim() !== String(parsed)) {
    return null;
  }

  if (parsed < minimumValue) {
    return null;
  }

  return parsed;
}

function normalizeCabinClass(value) {
  const normalizedValue = String(value || "economy")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  if (normalizedValue === "BUSINESS") {
    return "business";
  }

  if (normalizedValue === "FIRST") {
    return "first";
  }

  if (normalizedValue === "PREMIUM_ECONOMY" || normalizedValue === "PREMIUMECONOMY") {
    return "premium_economy";
  }

  return "economy";
}

function isSupportedCabin(value) {
  const normalizedValue = String(value || "economy")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  return [
    "ECONOMY",
    "PREMIUM_ECONOMY",
    "PREMIUMECONOMY",
    "BUSINESS",
    "FIRST",
  ].includes(normalizedValue);
}

function normalizeTripType(value, returnDate = "") {
  const normalizedValue = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

  if (!normalizedValue) {
    return returnDate ? "roundTrip" : "oneWay";
  }

  if (normalizedValue === "oneway") {
    return "oneWay";
  }

  if (normalizedValue === "roundtrip") {
    return "roundTrip";
  }

  if (normalizedValue === "multicity") {
    return "multiCity";
  }

  return "";
}

function normalizeSortOrder(value) {
  const normalizedValue = value?.trim().toUpperCase();

  if (normalizedValue === "PRICE") {
    return "price_high";
  }

  if (normalizedValue === "FASTEST") {
    return "fastest";
  }

  return "best";
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  return (
    parsedDate.getUTCFullYear() === year &&
    parsedDate.getUTCMonth() === month - 1 &&
    parsedDate.getUTCDate() === day
  );
}

function normalizeSearchValue(value) {
  return String(value || "").trim().toLowerCase();
}

function createRouteSearchKey({
  from,
  to,
  date,
  returnDate,
  tripType,
  adults,
  children,
  infants,
  cabin,
}) {
  return [
    normalizeSearchValue(from),
    normalizeSearchValue(to),
    normalizeSearchValue(date),
    normalizeSearchValue(returnDate),
    `tripType=${tripType}`,
    `adults=${adults}`,
    `children=${children}`,
    `infants=${infants}`,
    `cabin=${cabin}`,
  ].join("|");
}

function buildFlightError({ code, message, statusCode }) {
  return buildErrorResponse({
    provider: "flights",
    alias: "flights",
    code,
    message,
    statusCode,
  });
}

function buildBookingRequestError({ code, message, statusCode }) {
  return buildErrorResponse({
    provider: "flights",
    alias: "bookingRequest",
    code,
    message,
    statusCode,
  });
}

function getBodySize(body) {
  try {
    return Buffer.byteLength(JSON.stringify(body || {}), "utf8");
  } catch (_error) {
    return MAX_BOOKING_REQUEST_BYTES + 1;
  }
}

function hasRequiredText(value) {
  return String(value || "").trim().length > 0;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeCurrencyCode(value) {
  const normalizedValue = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, "");

  return normalizedValue || "USD";
}

function parsePriceNumber(value) {
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

function extractCalendarDate(value) {
  const match = String(value || "").match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : "";
}

function getFirstString(value, keys) {
  if (!isPlainObject(value)) {
    return "";
  }

  for (const key of keys) {
    const candidate = value[key];

    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return "";
}

function formatCalendarPrice(rawPrice, currency) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: Number.isInteger(rawPrice) ? 0 : 2,
    }).format(rawPrice);
  } catch (_error) {
    return `${rawPrice} ${currency}`;
  }
}

function normalizePriceValue(value, context = {}) {
  if (typeof value === "number" || typeof value === "string") {
    const raw = parsePriceNumber(value);
    const source = String(value || "").trim();

    return {
      raw,
      formatted:
        raw !== null && /[^\d\s.,]/.test(source) ? source : "",
      currency: normalizeCurrencyCode(context.currency),
    };
  }

  if (!isPlainObject(value)) {
    return {
      raw: null,
      formatted: "",
      currency: normalizeCurrencyCode(context.currency),
    };
  }

  const formatted = getFirstString(value, [
    "formatted",
    "formattedPrice",
    "priceFormatted",
    "displayPrice",
  ]);
  const currency = normalizeCurrencyCode(value.currency || value.currencyCode || context.currency);
  const candidateKeys = [
    "raw",
    "amount",
    "value",
    "price",
    "minPrice",
    "lowestPrice",
    "rawPrice",
    "priceAmount",
  ];

  for (const key of candidateKeys) {
    if (value[key] === undefined || value[key] === null || value[key] === value) {
      continue;
    }

    const normalizedPrice = normalizePriceValue(value[key], {
      currency,
    });

    if (normalizedPrice.raw !== null) {
      return {
        raw: normalizedPrice.raw,
        formatted: formatted || normalizedPrice.formatted,
        currency: normalizedPrice.currency || currency,
      };
    }
  }

  return {
    raw: null,
    formatted,
    currency,
  };
}

function findCalendarPrice(node, currency) {
  if (!isPlainObject(node)) {
    return normalizePriceValue(node, { currency });
  }

  const candidateKeys = [
    "price",
    "minPrice",
    "lowestPrice",
    "amount",
    "raw",
    "rawPrice",
    "value",
  ];

  for (const key of candidateKeys) {
    if (node[key] === undefined || node[key] === null) {
      continue;
    }

    const normalizedPrice = normalizePriceValue(node[key], {
      currency: node.currency || node.currencyCode || currency,
    });

    if (normalizedPrice.raw !== null) {
      return normalizedPrice;
    }
  }

  return {
    raw: null,
    formatted: "",
    currency: normalizeCurrencyCode(node.currency || node.currencyCode || currency),
  };
}

function addCalendarPrice(calendar, date, price, fallbackCurrency) {
  if (!date || price.raw === null) {
    return;
  }

  const currency = normalizeCurrencyCode(price.currency || fallbackCurrency);
  const entry = {
    raw: price.raw,
    formatted: price.formatted || formatCalendarPrice(price.raw, currency),
    currency,
  };
  const existingEntry = calendar[date];

  if (!existingEntry || entry.raw < existingEntry.raw) {
    calendar[date] = entry;
  }
}

function visitPriceCalendarNode(node, calendar, fallbackCurrency, inheritedDate = "", seen) {
  if (node === null || node === undefined) {
    return;
  }

  if (Array.isArray(node)) {
    node.forEach((item) =>
      visitPriceCalendarNode(item, calendar, fallbackCurrency, inheritedDate, seen)
    );
    return;
  }

  if (!isPlainObject(node)) {
    addCalendarPrice(
      calendar,
      inheritedDate,
      normalizePriceValue(node, { currency: fallbackCurrency }),
      fallbackCurrency
    );
    return;
  }

  if (seen.has(node)) {
    return;
  }

  seen.add(node);

  const date =
    extractCalendarDate(node.date) ||
    extractCalendarDate(node.day) ||
    extractCalendarDate(node.departureDate) ||
    extractCalendarDate(node.fromDate) ||
    inheritedDate;
  const price = findCalendarPrice(node, fallbackCurrency);

  addCalendarPrice(calendar, date, price, fallbackCurrency);

  Object.entries(node).forEach(([key, value]) => {
    const keyDate = extractCalendarDate(key);

    if (keyDate && !isPlainObject(value) && !Array.isArray(value)) {
      addCalendarPrice(
        calendar,
        keyDate,
        normalizePriceValue(value, { currency: fallbackCurrency }),
        fallbackCurrency
      );
      return;
    }

    if (!isPlainObject(value) && !Array.isArray(value)) {
      return;
    }

    visitPriceCalendarNode(value, calendar, fallbackCurrency, keyDate || date, seen);
  });
}

function normalizePriceCalendarPayload(payload, currency) {
  const calendar = {};

  visitPriceCalendarNode(
    payload?.data ?? payload?.calendar ?? payload,
    calendar,
    normalizeCurrencyCode(currency),
    "",
    new WeakSet()
  );

  return calendar;
}

function getErrorText(error) {
  return [
    error?.message,
    error?.details,
    error?.response?.data?.message,
    error?.response?.data?.error,
  ]
    .filter(Boolean)
    .map((value) => (typeof value === "string" ? value : JSON.stringify(value)))
    .join(" ");
}

function isUnsupportedCurrencyError(error) {
  const statusCode = error?.statusCode || error?.response?.status;
  const errorText = getErrorText(error).toLowerCase();

  return (
    errorText.includes("currency") &&
    ([400, 422].includes(statusCode) ||
      /(unsupported|invalid|not supported)/i.test(errorText))
  );
}

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function buildPriceCalendarQueryDebug({
  originSkyId,
  destinationSkyId,
  fromDate,
  currency,
  market,
  countryCode,
  locale,
}) {
  return {
    originSkyId,
    destinationSkyId,
    fromDate,
    currency,
    market,
    countryCode,
    locale,
  };
}

function buildPriceCalendarDebug({ query, error }) {
  if (isProduction()) {
    return undefined;
  }

  const providerDiagnostics = error?.providerDebug || error?.providerDiagnostics || {};

  return {
    providerStatus: providerDiagnostics.providerStatus ?? null,
    providerStatusText: providerDiagnostics.providerStatusText ?? null,
    providerCode: providerDiagnostics.providerCode ?? null,
    providerMessage: providerDiagnostics.providerMessage ?? null,
    providerBody: providerDiagnostics.providerBody ?? null,
    networkCode: providerDiagnostics.networkCode ?? error?.code ?? null,
    networkMessage: providerDiagnostics.networkMessage ?? error?.message ?? null,
    errorName: providerDiagnostics.errorName ?? error?.name ?? null,
    errorMessage: providerDiagnostics.errorMessage ?? error?.message ?? null,
    endpoint: providerDiagnostics.endpoint || PRICE_CALENDAR_PATH,
    host: providerDiagnostics.host || SKY_SCRAPPER_HOST,
    url: providerDiagnostics.url || `https://${SKY_SCRAPPER_HOST}${PRICE_CALENDAR_PATH}`,
    query: providerDiagnostics.query || query,
    attempt: providerDiagnostics.attempt ?? null,
    flags: providerDiagnostics.flags || null,
  };
}

function normalizeFlightErrorCode(error) {
  if (error?.code === "PROVIDER_LIMITED" || error?.code === "BLOCKED_OR_CAPTCHA") {
    return "PROVIDER_LIMITED";
  }

  if (error?.code === "VALIDATION_ERROR") {
    return "VALIDATION_ERROR";
  }

  return "PROVIDER_UNAVAILABLE";
}

function getStatusCodeForError(code, error) {
  if (code === "VALIDATION_ERROR") {
    return 400;
  }

  if (code === "PROVIDER_LIMITED") {
    return 429;
  }

  return error?.statusCode && error.statusCode >= 500 ? 503 : 502;
}

function getMessageForError(code) {
  if (code === "VALIDATION_ERROR") {
    return FLIGHT_MESSAGES.validation;
  }

  if (code === "PROVIDER_LIMITED") {
    return FLIGHT_MESSAGES.providerLimited;
  }

  return FLIGHT_MESSAGES.providerUnavailable;
}

router.post("/booking-request", async (req, res) => {
  const payload = req.body || {};
  const payloadSize = getBodySize(payload);
  const selectedFlight = payload.selectedFlight;
  const customerEmail = String(payload.customerEmail || "").trim();

  if (payloadSize > MAX_BOOKING_REQUEST_BYTES) {
    logFlightDiagnostic(
      "booking request validation failed",
      { reason: "payload too large", payloadSize },
      "warn"
    );

    const errorResponse = buildBookingRequestError({
      code: "PAYLOAD_TOO_LARGE",
      message: BOOKING_REQUEST_MESSAGES.payloadTooLarge,
      statusCode: 413,
    });

    return res.status(errorResponse.statusCode).json(errorResponse.body);
  }

  if (
    !hasRequiredText(payload.customerName) ||
    !hasRequiredText(customerEmail) ||
    !EMAIL_PATTERN.test(customerEmail) ||
    !hasRequiredText(payload.customerPhone) ||
    !isPlainObject(selectedFlight)
  ) {
    logFlightDiagnostic(
      "booking request validation failed",
      { reason: "missing or invalid fields" },
      "warn"
    );

    const errorResponse = buildBookingRequestError({
      code: "VALIDATION_ERROR",
      message: BOOKING_REQUEST_MESSAGES.validation,
      statusCode: 400,
    });

    return res.status(errorResponse.statusCode).json(errorResponse.body);
  }

  try {
    await sendFlightBookingRequestEmail({
      ...payload,
      customerEmail,
      language: payload.language === "ka" ? "ka" : "en",
    });

    logFlightDiagnostic("booking request sent", {
      route: selectedFlight.route || selectedFlight.routeLabel,
    });

    return res.status(201).json(
      buildSuccessResponse({
        provider: "flights",
        alias: "bookingRequest",
        results: [],
        code: "BOOKING_REQUEST_SENT",
        message: BOOKING_REQUEST_MESSAGES.sent,
      })
    );
  } catch (err) {
    const isEmailNotConfigured = err?.code === "EMAIL_NOT_CONFIGURED";

    logFlightDiagnostic(
      "booking request email failed",
      {
        code: isEmailNotConfigured ? "EMAIL_NOT_CONFIGURED" : "EMAIL_SEND_FAILED",
      },
      isEmailNotConfigured ? "warn" : "error"
    );

    const errorResponse = buildBookingRequestError({
      code: isEmailNotConfigured ? "EMAIL_NOT_CONFIGURED" : "EMAIL_SEND_FAILED",
      message: isEmailNotConfigured
        ? BOOKING_REQUEST_MESSAGES.emailNotConfigured
        : BOOKING_REQUEST_MESSAGES.sendFailed,
      statusCode: isEmailNotConfigured ? 503 : 502,
    });

    return res.status(errorResponse.statusCode).json(errorResponse.body);
  }
});

router.get("/price-calendar", async (req, res) => {
  const originSkyId = req.query.originSkyId?.trim();
  const destinationSkyId = req.query.destinationSkyId?.trim();
  const fromDate = req.query.fromDate?.trim();
  const rawCurrency = req.query.currency?.trim();
  const requestedCurrency = normalizeCurrencyCode(rawCurrency);
  const market = req.query.market?.trim() || "en-US";
  const countryCode = req.query.countryCode?.trim().toUpperCase() || "US";
  const locale = req.query.locale?.trim() || market;

  if (!originSkyId || !destinationSkyId || !fromDate || !rawCurrency) {
    logFlightDiagnostic(
      "price calendar validation failed",
      { reason: "missing required params" },
      "warn"
    );

    return res.status(400).json({
      ok: false,
      provider: "flights",
      code: "VALIDATION_ERROR",
      message: FLIGHT_MESSAGES.validation,
      calendar: {},
    });
  }

  if (!isValidDate(fromDate)) {
    logFlightDiagnostic(
      "price calendar validation failed",
      { reason: "invalid date format" },
      "warn"
    );

    return res.status(400).json({
      ok: false,
      provider: "flights",
      code: "VALIDATION_ERROR",
      message: FLIGHT_MESSAGES.validation,
      calendar: {},
    });
  }

  let activeCurrency = requestedCurrency;
  let currencyFallback = false;
  const initialQueryDebug = buildPriceCalendarQueryDebug({
    originSkyId,
    destinationSkyId,
    fromDate,
    currency: activeCurrency,
    market,
    countryCode,
    locale,
  });

  logFlightDiagnostic("price calendar request received", {
    endpoint: PRICE_CALENDAR_PATH,
    host: SKY_SCRAPPER_HOST,
    url: `https://${SKY_SCRAPPER_HOST}${PRICE_CALENDAR_PATH}`,
    query: initialQueryDebug,
  });

  try {
    let result;

    try {
      result = await fetchPriceCalendar({
        originSkyId,
        destinationSkyId,
        fromDate,
        currency: activeCurrency,
        market,
        countryCode,
        locale,
      });
    } catch (error) {
      if (activeCurrency !== "USD" && isUnsupportedCurrencyError(error)) {
        activeCurrency = "USD";
        currencyFallback = true;
        logFlightDiagnostic(
          "price calendar currency fallback",
          {
            endpoint: PRICE_CALENDAR_PATH,
            host: SKY_SCRAPPER_HOST,
            requestedCurrency,
            fallbackCurrency: activeCurrency,
            providerStatus:
              (error?.providerDebug || error?.providerDiagnostics)?.providerStatus,
            providerMessage:
              (error?.providerDebug || error?.providerDiagnostics)?.providerMessage,
          },
          "warn"
        );
        result = await fetchPriceCalendar({
          originSkyId,
          destinationSkyId,
          fromDate,
          currency: activeCurrency,
          market: "en-US",
          countryCode: "US",
          locale: "en-US",
        });
      } else {
        throw error;
      }
    }

    const calendar = normalizePriceCalendarPayload(result?.payload, activeCurrency);

    logFlightDiagnostic("price calendar normalized", {
      originSkyId,
      destinationSkyId,
      fromDate,
      requestedCurrency,
      activeCurrency,
      currencyFallback,
      resultCount: Object.keys(calendar).length,
      cached: Boolean(result?.meta?.cached),
    });

    return res.json({
      ok: true,
      provider: "flights",
      calendar,
      currency: activeCurrency,
      requestedCurrency,
      currencyFallback,
      meta: {
        ...(result?.meta || {}),
        endpoint: "/api/v1/flights/getPriceCalendar",
        host: SKY_SCRAPPER_HOST,
        fromDate,
      },
    });
  } catch (err) {
    const code = normalizeFlightErrorCode(err);
    const statusCode = getStatusCodeForError(code, err);
    const message = getMessageForError(code);

    logFlightDiagnostic(
      "price calendar error",
      {
        providerDebug: err?.providerDebug || err?.providerDiagnostics || null,
        originSkyId,
        destinationSkyId,
        fromDate,
        endpoint: PRICE_CALENDAR_PATH,
        host: SKY_SCRAPPER_HOST,
        code,
        statusCode,
        providerStatus: (err?.providerDebug || err?.providerDiagnostics)?.providerStatus,
        providerStatusText:
          (err?.providerDebug || err?.providerDiagnostics)?.providerStatusText,
        providerCode: (err?.providerDebug || err?.providerDiagnostics)?.providerCode,
        providerMessage:
          (err?.providerDebug || err?.providerDiagnostics)?.providerMessage,
        providerBody: (err?.providerDebug || err?.providerDiagnostics)?.providerBody,
        networkCode: (err?.providerDebug || err?.providerDiagnostics)?.networkCode,
        networkMessage:
          (err?.providerDebug || err?.providerDiagnostics)?.networkMessage,
        errorName: (err?.providerDebug || err?.providerDiagnostics)?.errorName,
        errorMessage: (err?.providerDebug || err?.providerDiagnostics)?.errorMessage,
        query: (err?.providerDebug || err?.providerDiagnostics)?.query || initialQueryDebug,
      },
      code === "PROVIDER_LIMITED" || code === "VALIDATION_ERROR" ? "warn" : "error"
    );

    const errorBody = {
      ok: false,
      provider: "flights",
      code,
      message,
      calendar: {},
    };
    const debug = buildPriceCalendarDebug({
      query: initialQueryDebug,
      error: err,
    });

    if (debug) {
      errorBody.debug = debug;
      errorBody.providerDebug = debug;
    }

    return res.status(statusCode).json(errorBody);
  }
});

router.get("/search", async (req, res) => {
  const from = req.query.from?.trim();
  const to = req.query.to?.trim();
  const date = req.query.date?.trim();
  const rawReturnDate = req.query.returnDate?.trim() || "";
  const tripType = normalizeTripType(req.query.tripType, rawReturnDate);
  const returnDate = tripType === "roundTrip" ? rawReturnDate : "";
  const rawCabin = req.query.classOfService || req.query.cabin || "economy";
  const classOfService = normalizeCabinClass(rawCabin);
  const sortOrder = normalizeSortOrder(req.query.sortOrder);
  const currencyCode = req.query.currencyCode?.trim().toUpperCase() || "USD";
  const numAdults = parseCount(
    req.query.numAdults ?? req.query.adults ?? req.query.passengers,
    1,
    1
  );
  const numChildren = parseCount(req.query.children, 0, 0);
  const numInfants = parseCount(req.query.infants, 0, 0);
  const market = req.query.market?.trim() || "en-US";
  const countryCode = req.query.countryCode?.trim().toUpperCase() || "US";
  const searchKey = createRouteSearchKey({
    from,
    to,
    date,
    returnDate,
    tripType,
    adults: numAdults,
    children: numChildren,
    infants: numInfants,
    cabin: classOfService,
  });

  if (
    !from ||
    !to ||
    !date ||
    !SUPPORTED_TRIP_TYPES.has(tripType) ||
    !isSupportedCabin(rawCabin) ||
    numAdults === null ||
    numChildren === null ||
    numInfants === null
  ) {
    logFlightDiagnostic(
      "validation failed",
      { searchKey, reason: "invalid or missing params" },
      "warn"
    );
    const errorResponse = buildFlightError({
      code: "VALIDATION_ERROR",
      message: FLIGHT_MESSAGES.validation,
      statusCode: 400,
    });

    return res.status(errorResponse.statusCode).json(errorResponse.body);
  }

  if (tripType === "roundTrip" && !returnDate) {
    logFlightDiagnostic(
      "validation failed",
      { searchKey, reason: "missing return date" },
      "warn"
    );
    const errorResponse = buildFlightError({
      code: "VALIDATION_ERROR",
      message: FLIGHT_MESSAGES.validation,
      statusCode: 400,
    });

    return res.status(errorResponse.statusCode).json(errorResponse.body);
  }

  if (!isValidDate(date) || (returnDate && !isValidDate(returnDate))) {
    logFlightDiagnostic(
      "validation failed",
      { searchKey, reason: "invalid date format" },
      "warn"
    );
    const errorResponse = buildFlightError({
      code: "VALIDATION_ERROR",
      message: FLIGHT_MESSAGES.validation,
      statusCode: 400,
    });

    return res.status(errorResponse.statusCode).json(errorResponse.body);
  }

  if (normalizeSearchValue(from) === normalizeSearchValue(to)) {
    logFlightDiagnostic(
      "validation failed",
      { searchKey, reason: "same origin and destination" },
      "warn"
    );
    const errorResponse = buildFlightError({
      code: "VALIDATION_ERROR",
      message: FLIGHT_MESSAGES.validation,
      statusCode: 400,
    });

    return res.status(errorResponse.statusCode).json(errorResponse.body);
  }

  if (tripType === "multiCity") {
    logFlightDiagnostic("multi-city unsupported", { searchKey }, "info");

    return res.json(
      buildSuccessResponse({
        provider: "flights",
        alias: "flights",
        results: [],
        code: "FEATURE_NOT_SUPPORTED",
        message: FLIGHT_MESSAGES.multiCityUnsupported,
        extra: {
          query: {
            from,
            to,
            date,
            tripType,
            classOfService,
            currencyCode,
            numAdults,
            numChildren,
            numInfants,
            market,
            countryCode,
          },
          meta: {
            cached: false,
            resultCount: 0,
            unsupportedFeature: "multiCity",
          },
        },
      })
    );
  }

  logFlightDiagnostic("search received", {
    searchKey,
    from,
    to,
    date,
    returnDate: returnDate || undefined,
    tripType,
    numAdults,
    numChildren,
    numInfants,
    classOfService,
  });

  try {
    const { payload, origin, destination, meta } = await searchFlights({
      from,
      to,
      date,
      returnDate,
      tripType,
      adults: numAdults,
      children: numChildren,
      infants: numInfants,
      cabinClass: classOfService,
      sortBy: sortOrder,
      currency: currencyCode,
      market,
      countryCode,
    });

    if (payload?.status === false) {
      const errorResponse = buildFlightError({
        code: "PROVIDER_UNAVAILABLE",
        message: FLIGHT_MESSAGES.providerUnavailable,
        statusCode: 502,
      });

      return res.status(errorResponse.statusCode).json(errorResponse.body);
    }

    const flights = normalizeFlights(payload, currencyCode);
    const extra = {
      query: {
        from,
        to,
        date,
        returnDate: returnDate || undefined,
        tripType,
        classOfService,
        currencyCode,
        numAdults,
        numChildren,
        numInfants,
        market,
        countryCode,
      },
      places: {
        origin,
        destination,
      },
      meta: {
        ...meta,
        resultCount: flights.length,
      },
    };

    if (flights.length === 0) {
      logFlightDiagnostic("final normalized result", {
        searchKey,
        code: "NO_RESULTS",
        resultCount: 0,
        cached: Boolean(meta?.cached),
      });

      return res.json(
        buildSuccessResponse({
          provider: "flights",
          alias: "flights",
          results: [],
          code: "NO_RESULTS",
          message: FLIGHT_MESSAGES.noResults,
          extra,
        })
      );
    }

    logFlightDiagnostic("final normalized result", {
      searchKey,
      code: "OK",
      resultCount: flights.length,
      cached: Boolean(meta?.cached),
    });

    return res.json(
      buildSuccessResponse({
        provider: "flights",
        alias: "flights",
        results: flights,
        extra,
      })
    );
  } catch (err) {
    const code = normalizeFlightErrorCode(err);
    const statusCode = getStatusCodeForError(code, err);
    const message = getMessageForError(code);

    logFlightDiagnostic(
      "final normalized error",
      {
        searchKey,
        code,
        statusCode,
        cached: Boolean(err?.cached),
      },
      code === "PROVIDER_LIMITED" || code === "VALIDATION_ERROR" ? "warn" : "error"
    );

    const errorResponse = buildFlightError({
      code,
      statusCode,
      message,
    });

    return res.status(errorResponse.statusCode).json(errorResponse.body);
  }
});

module.exports = router;
