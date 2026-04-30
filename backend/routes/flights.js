const express = require("express");
const router = express.Router();
const {
  normalizeFlights,
  searchFlights,
} = require("../services/skyScrapper");
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
