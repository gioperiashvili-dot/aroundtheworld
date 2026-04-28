const express = require("express");
const router = express.Router();
const {
  normalizeFlights,
  searchFlights,
} = require("../services/skyScrapper");
const {
  buildErrorResponse,
  buildSuccessResponse,
} = require("../utils/apiResponses");
const { logProviderDiagnostic } = require("../utils/providerDiagnostics");

const FLIGHT_MESSAGES = {
  providerLimited:
    "ფრენების სერვისი დროებით გადატვირთულია. გთხოვთ სცადოთ რამდენიმე წუთში.",
  validation: "გთხოვთ გადაამოწმოთ მიმართულება და თარიღი.",
  noResults:
    "ამ მიმართულებაზე ფრენები ვერ მოიძებნა. სცადეთ სხვა თარიღი ან მიმართულება.",
  providerUnavailable:
    "ფრენების სერვისი დროებით მიუწვდომელია. გთხოვთ სცადოთ ცოტა ხანში.",
};

function logFlightDiagnostic(label, details = {}, level = "info") {
  logProviderDiagnostic("Flights", label, details, level);
}

function parseCount(value, fallbackValue) {
  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed < 1) {
    return fallbackValue;
  }

  return parsed;
}

function normalizeCabinClass(value) {
  const normalizedValue = value?.trim().toUpperCase();

  if (normalizedValue === "BUSINESS") {
    return "business";
  }

  if (normalizedValue === "FIRST") {
    return "first";
  }

  if (normalizedValue === "PREMIUM_ECONOMY") {
    return "premium_economy";
  }

  return "economy";
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
  numAdults,
  classOfService,
}) {
  return [
    normalizeSearchValue(from),
    normalizeSearchValue(to),
    normalizeSearchValue(date),
    normalizeSearchValue(returnDate),
    `adults=${numAdults}`,
    `cabin=${classOfService}`,
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

router.get("/search", async (req, res) => {
  const from = req.query.from?.trim();
  const to = req.query.to?.trim();
  const date = req.query.date?.trim();
  const returnDate = req.query.returnDate?.trim() || "";
  const classOfService = normalizeCabinClass(
    req.query.classOfService || req.query.cabin
  );
  const sortOrder = normalizeSortOrder(req.query.sortOrder);
  const currencyCode = req.query.currencyCode?.trim().toUpperCase() || "USD";
  const numAdults = parseCount(
    req.query.numAdults ?? req.query.adults ?? req.query.passengers,
    1
  );
  const market = req.query.market?.trim() || "en-US";
  const countryCode = req.query.countryCode?.trim().toUpperCase() || "US";
  const searchKey = createRouteSearchKey({
    from,
    to,
    date,
    returnDate,
    numAdults,
    classOfService,
  });

  if (!from || !to || !date) {
    logFlightDiagnostic(
      "validation failed",
      { searchKey, reason: "missing required params" },
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

  logFlightDiagnostic("search received", {
    searchKey,
    from,
    to,
    date,
    returnDate: returnDate || undefined,
    numAdults,
    classOfService,
  });

  try {
    const { payload, origin, destination, meta } = await searchFlights({
      from,
      to,
      date,
      returnDate,
      adults: numAdults,
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
        classOfService,
        currencyCode,
        numAdults,
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
