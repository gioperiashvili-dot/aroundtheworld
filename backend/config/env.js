const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

function assertRequiredEnvVars(variableNames) {
  const missing = variableNames.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

module.exports = {
  PORT: process.env.PORT || 5000,
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || "http://localhost:3000",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "12345",
  RAPIDAPI_KEY: process.env.RAPIDAPI_KEY,
  RAPIDAPI_HOST: process.env.RAPIDAPI_HOST || "tripadvisor16.p.rapidapi.com",
  SKY_SCRAPPER_HOST:
    process.env.SKY_SCRAPPER_HOST || "sky-scrapper.p.rapidapi.com",
  TRIPADVISOR_HOST:
    process.env.TRIPADVISOR_HOST ||
    process.env.RAPIDAPI_HOST ||
    "tripadvisor16.p.rapidapi.com",
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT || "587",
  SMTP_SECURE: process.env.SMTP_SECURE || "false",
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  BOOKING_REQUEST_TO: process.env.BOOKING_REQUEST_TO || "info@aroundworld.ge",
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
  FIREBASE_SERVICE_ACCOUNT_JSON: process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
  assertRequiredEnvVars,
};
