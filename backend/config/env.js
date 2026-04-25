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
  assertRequiredEnvVars,
};
