const express = require("express");
const router = express.Router();
const {
  formatSkyScrapperDetails,
  normalizeFlights,
  searchFlights,
} = require("../services/skyScrapper");
const {
  buildErrorResponse,
  buildSuccessResponse,
} = require("../utils/apiResponses");

function parseCount(value, fallbackValue) {
  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed < 0) {
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
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

router.get("/search", async (req, res) => {
  const from = req.query.from?.trim();
  const to = req.query.to?.trim();
  const date = req.query.date?.trim();
  const classOfService = normalizeCabinClass(req.query.classOfService);
  const sortOrder = normalizeSortOrder(req.query.sortOrder);
  const currencyCode = req.query.currencyCode?.trim().toUpperCase() || "USD";
  const numAdults = parseCount(req.query.numAdults, 1);
  const market = req.query.market?.trim() || "en-US";
  const countryCode = req.query.countryCode?.trim().toUpperCase() || "US";

  if (!from || !to || !date) {
    const errorResponse = buildErrorResponse({
      provider: "sky-scrapper",
      alias: "flights",
      code: "VALIDATION_ERROR",
      message: "from, to, and date are required.",
      statusCode: 400,
    });

    return res.status(errorResponse.statusCode).json(errorResponse.body);
  }

  if (!isValidDate(date)) {
    const errorResponse = buildErrorResponse({
      provider: "sky-scrapper",
      alias: "flights",
      code: "VALIDATION_ERROR",
      message: "date must be in YYYY-MM-DD format.",
      statusCode: 400,
    });

    return res.status(errorResponse.statusCode).json(errorResponse.body);
  }

  try {
    const { payload, origin, destination, meta } = await searchFlights({
      from,
      to,
      date,
      adults: numAdults,
      cabinClass: classOfService,
      sortBy: sortOrder,
      currency: currencyCode,
      market,
      countryCode,
    });

    if (payload?.status === false) {
      const errorResponse = buildErrorResponse({
        provider: "sky-scrapper",
        alias: "flights",
        code: "PROVIDER_UNAVAILABLE",
        message: "Flight provider is temporarily unavailable. Please try again in a moment.",
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
      return res.json(
        buildSuccessResponse({
          provider: "sky-scrapper",
          alias: "flights",
          results: [],
          code: "NO_RESULTS",
          message: "No results found",
          extra,
        })
      );
    }

    return res.json(
      buildSuccessResponse({
        provider: "sky-scrapper",
        alias: "flights",
        results: flights,
        extra,
      })
    );
  } catch (err) {
    const code = err.code || "UNKNOWN_PROVIDER_ERROR";
    const statusCode = err.statusCode || err.response?.status || 500;
    const messageByCode = {
      BLOCKED_OR_CAPTCHA: "Too many requests. Please wait and try again.",
      PROVIDER_UNAVAILABLE:
        "Flight provider is temporarily unavailable. Please try again in a moment.",
      VALIDATION_ERROR: err.details || err.message || "Please check your route and date.",
      UNKNOWN_PROVIDER_ERROR:
        "Flight provider returned an unexpected response. Please try again later.",
    };
    const errorResponse = buildErrorResponse({
      provider: "sky-scrapper",
      alias: "flights",
      code,
      statusCode,
      message:
        messageByCode[code] ||
        err.details ||
        err.message ||
        formatSkyScrapperDetails(err.response?.data?.message) ||
        "Please try again in a moment.",
      extra: {
        details:
          err.details ||
          (err.response?.data?.message
            ? formatSkyScrapperDetails(err.response.data.message)
            : undefined),
      },
    });

    return res.status(errorResponse.statusCode).json(errorResponse.body);
  }
});

module.exports = router;
