const express = require("express");
const router = express.Router();
const { getTourById, getTours } = require("../services/tours");
const {
  MAX_BOOKING_REQUEST_BYTES,
  sendTourBookingRequestEmail,
} = require("../services/tourBookingEmail");
const {
  buildErrorResponse,
  buildSuccessResponse,
} = require("../utils/apiResponses");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const BOOKING_REQUEST_MESSAGES = {
  sent:
    "Your request has been sent successfully. Our operator will contact you soon.",
  validation: "Please provide your name, email, phone, and selected tour.",
  emailNotConfigured: "Tour booking email is not configured.",
  sendFailed:
    "We could not send your booking request right now. Please try again later.",
  payloadTooLarge: "Booking request payload is too large.",
};

function buildBookingRequestError({ code, message, statusCode }) {
  return buildErrorResponse({
    provider: "tours",
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

router.get("/", async (_req, res) => {
  try {
    const tours = await getTours();

    return res.json({
      tours,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.message || "Unable to load tours",
      details: error.details || "Please try again in a moment.",
      tours: [],
    });
  }
});

router.post("/booking-request", async (req, res) => {
  const payload = req.body || {};
  const payloadSize = getBodySize(payload);
  const selectedTour = payload.selectedTour;
  const customerEmail = String(payload.customerEmail || "").trim();

  if (payloadSize > MAX_BOOKING_REQUEST_BYTES) {
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
    !isPlainObject(selectedTour)
  ) {
    const errorResponse = buildBookingRequestError({
      code: "VALIDATION_ERROR",
      message: BOOKING_REQUEST_MESSAGES.validation,
      statusCode: 400,
    });

    return res.status(errorResponse.statusCode).json(errorResponse.body);
  }

  try {
    await sendTourBookingRequestEmail({
      ...payload,
      customerEmail,
      language: payload.language === "ka" ? "ka" : "en",
    });

    return res.status(201).json(
      buildSuccessResponse({
        provider: "tours",
        alias: "bookingRequest",
        results: [],
        code: "BOOKING_REQUEST_SENT",
        message: BOOKING_REQUEST_MESSAGES.sent,
      })
    );
  } catch (error) {
    const isEmailNotConfigured = error?.code === "EMAIL_NOT_CONFIGURED";
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

router.get("/:id", async (req, res) => {
  try {
    const tour = await getTourById(req.params.id);

    if (!tour) {
      return res.status(404).json({
        error: "Tour not found",
        details: "We could not find a tour with that id.",
      });
    }

    return res.json({
      tour,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.message || "Unable to load tour",
      details: error.details || "Please try again in a moment.",
    });
  }
});

module.exports = router;
