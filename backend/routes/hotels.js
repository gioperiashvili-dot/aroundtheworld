const express = require("express");
const router = express.Router();
const { searchHotels } = require("../services/tripadvisor");
const {
  buildErrorResponse,
  buildSuccessResponse,
} = require("../utils/apiResponses");

function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseCount(value, fallbackValue) {
  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed < 1) {
    return fallbackValue;
  }

  return parsed;
}

router.get("/search", async (req, res) => {
  const city = req.query.city?.trim();
  const checkIn = req.query.checkIn?.trim();
  const checkOut = req.query.checkOut?.trim();
  const rooms = parseCount(req.query.rooms, 1);
  const adults = parseCount(req.query.adults, 2);
  const currencyCode = req.query.currencyCode?.trim().toUpperCase() || "USD";

  if (!city || !checkIn || !checkOut) {
    const errorResponse = buildErrorResponse({
      provider: "tripadvisor",
      alias: "hotels",
      code: "VALIDATION_ERROR",
      message: "city, checkIn, and checkOut are required.",
      statusCode: 400,
    });

    return res.status(errorResponse.statusCode).json(errorResponse.body);
  }

  if (!isValidDate(checkIn) || !isValidDate(checkOut)) {
    const errorResponse = buildErrorResponse({
      provider: "tripadvisor",
      alias: "hotels",
      code: "VALIDATION_ERROR",
      message: "checkIn and checkOut must be in YYYY-MM-DD format.",
      statusCode: 400,
    });

    return res.status(errorResponse.statusCode).json(errorResponse.body);
  }

  if (checkOut <= checkIn) {
    const errorResponse = buildErrorResponse({
      provider: "tripadvisor",
      alias: "hotels",
      code: "VALIDATION_ERROR",
      message: "checkOut must be after checkIn.",
      statusCode: 400,
    });

    return res.status(errorResponse.statusCode).json(errorResponse.body);
  }

  try {
    const { location, hotels } = await searchHotels({
      city,
      checkIn,
      checkOut,
      rooms,
      adults,
      currencyCode,
    });

    const extra = {
      query: {
        city,
        checkIn,
        checkOut,
        rooms,
        adults,
        currencyCode,
      },
      location,
    };

    if (hotels.length === 0) {
      return res.json(
        buildSuccessResponse({
          provider: "tripadvisor",
          alias: "hotels",
          results: [],
          code: "NO_RESULTS",
          message: "No results found",
          extra,
        })
      );
    }

    return res.json(
      buildSuccessResponse({
        provider: "tripadvisor",
        alias: "hotels",
        results: hotels,
        extra,
      })
    );
  } catch (error) {
    const code = error.code || "PROVIDER_UNAVAILABLE";
    const errorResponse = buildErrorResponse({
      provider: "tripadvisor",
      alias: "hotels",
      code,
      message: error.message || "Tripadvisor service is temporarily unavailable. Please try again later.",
      statusCode: error.statusCode || 500,
      extra: {
        details: error.details,
      },
    });

    return res.status(errorResponse.statusCode).json(errorResponse.body);
  }
});

module.exports = router;
