const express = require("express");
const router = express.Router();
const { searchRestaurants } = require("../services/tripadvisor");
const {
  buildErrorResponse,
  buildSuccessResponse,
} = require("../utils/apiResponses");

function parseCount(value, fallbackValue) {
  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed < 1) {
    return fallbackValue;
  }

  return parsed;
}

router.get("/search", async (req, res) => {
  const city = req.query.city?.trim();
  const page = parseCount(req.query.page, 1);

  if (!city) {
    const errorResponse = buildErrorResponse({
      provider: "tripadvisor",
      alias: "restaurants",
      code: "VALIDATION_ERROR",
      message: "city is required.",
      statusCode: 400,
    });

    return res.status(errorResponse.statusCode).json(errorResponse.body);
  }

  try {
    const { location, restaurants } = await searchRestaurants({
      city,
      page,
    });

    const extra = {
      query: {
        city,
        page,
      },
      location,
    };

    if (restaurants.length === 0) {
      return res.json(
        buildSuccessResponse({
          provider: "tripadvisor",
          alias: "restaurants",
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
        alias: "restaurants",
        results: restaurants,
        extra,
      })
    );
  } catch (error) {
    const code = error.code || "PROVIDER_UNAVAILABLE";
    const errorResponse = buildErrorResponse({
      provider: "tripadvisor",
      alias: "restaurants",
      code,
      message:
        error.message ||
        "Tripadvisor service is temporarily unavailable. Please try again later.",
      statusCode: error.statusCode || 500,
      extra: {
        details: error.details,
      },
    });

    return res.status(errorResponse.statusCode).json(errorResponse.body);
  }
});

module.exports = router;
