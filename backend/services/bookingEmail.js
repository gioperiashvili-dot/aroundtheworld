const nodemailer = require("nodemailer");
const {
  BOOKING_REQUEST_TO,
  SMTP_HOST,
  SMTP_FROM,
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

function getSmtpHost() {
  return String(SMTP_HOST || "").trim();
}

function getSmtpPort() {
  return String(SMTP_PORT || "").trim();
}

function getSmtpUser() {
  return String(SMTP_USER || "").trim();
}

function isEmailConfigured() {
  return Boolean(getSmtpHost() && getSmtpPort() && getSmtpUser() && SMTP_PASS);
}

function getConfiguredSender() {
  return String(SMTP_FROM || getSmtpUser() || "").trim();
}

function getEmailDomain(value) {
  const source = String(value || "").trim();
  const emailMatch = source.match(/<([^<>]+)>/);
  const email = emailMatch ? emailMatch[1] : source;
  const domain = email.includes("@") ? email.split("@").pop() : "";

  return domain ? domain.toLowerCase() : "";
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
    host: getSmtpHost(),
    port: Number.parseInt(getSmtpPort(), 10) || 587,
    secure: parseBoolean(SMTP_SECURE),
    auth: {
      user: getSmtpUser(),
      pass: SMTP_PASS,
    },
  });
}

async function sendBookingEmail({ replyTo, subject, text, html }) {
  const transporter = createTransporter();

  return transporter.sendMail({
    from: getConfiguredSender(),
    to: BOOKING_REQUEST_TO,
    replyTo,
    subject,
    text,
    html,
  });
}

function getBookingEmailErrorDiagnostics(error) {
  return {
    smtpCode: error?.code || "",
    smtpCommand: error?.command || "",
    smtpResponseCode: error?.responseCode || null,
    smtpResponse: error?.response || "",
    smtpMessage: error?.message || "",
    transport: {
      host: getSmtpHost(),
      port: getSmtpPort(),
      secure: parseBoolean(SMTP_SECURE),
      userConfigured: Boolean(getSmtpUser()),
      passwordConfigured: Boolean(SMTP_PASS),
      fromConfigured: Boolean(getConfiguredSender()),
      fromDomain: getEmailDomain(getConfiguredSender()),
      recipientConfigured: Boolean(BOOKING_REQUEST_TO),
      recipientDomain: getEmailDomain(BOOKING_REQUEST_TO),
    },
  };
}

module.exports = {
  MAX_BOOKING_REQUEST_BYTES,
  MAX_LONG_TEXT_LENGTH,
  MAX_TEXT_LENGTH,
  createBookingEmailNotConfiguredError,
  escapeHtml,
  getBookingEmailErrorDiagnostics,
  normalizeText,
  sendBookingEmail,
};
