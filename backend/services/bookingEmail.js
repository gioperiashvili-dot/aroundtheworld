const nodemailer = require("nodemailer");
const {
  BOOKING_REQUEST_TO,
  SMTP_HOST,
  SMTP_PASS,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
} = require("../config/env");

const MAX_BOOKING_REQUEST_BYTES = 40 * 1024;
const MAX_TEXT_LENGTH = 1000;
const MAX_LONG_TEXT_LENGTH = 5000;

function parseBoolean(value) {
  return ["1", "true", "yes"].includes(String(value || "").trim().toLowerCase());
}

function isEmailConfigured() {
  return Boolean(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS);
}

function normalizeText(value, maxLength = MAX_TEXT_LENGTH) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function escapeHtml(value) {
  return normalizeText(value, MAX_LONG_TEXT_LENGTH).replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]
  );
}

function createBookingEmailNotConfiguredError(message = "Booking email is not configured.") {
  const error = new Error(message);
  error.code = "EMAIL_NOT_CONFIGURED";
  error.statusCode = 503;
  return error;
}

function createTransporter() {
  if (!isEmailConfigured()) {
    throw createBookingEmailNotConfiguredError();
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number.parseInt(SMTP_PORT, 10) || 587,
    secure: parseBoolean(SMTP_SECURE),
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

async function sendBookingEmail({ replyTo, subject, text, html }) {
  const transporter = createTransporter();

  return transporter.sendMail({
    from: SMTP_USER,
    to: BOOKING_REQUEST_TO,
    replyTo,
    subject,
    text,
    html,
  });
}

module.exports = {
  MAX_BOOKING_REQUEST_BYTES,
  MAX_LONG_TEXT_LENGTH,
  MAX_TEXT_LENGTH,
  createBookingEmailNotConfiguredError,
  escapeHtml,
  normalizeText,
  sendBookingEmail,
};
