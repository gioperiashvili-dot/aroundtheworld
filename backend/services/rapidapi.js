const axios = require("axios");
const { RAPIDAPI_KEY, assertRequiredEnvVars } = require("../config/env");

async function rapidApiGet({ host, path, params, timeout = 20000 }) {
  try {
    assertRequiredEnvVars(["RAPIDAPI_KEY"]);
  } catch (_error) {
    const configError = new Error("Required provider configuration is missing.");
    configError.code = "SERVER_CONFIGURATION_ERROR";
    configError.statusCode = 500;
    throw configError;
  }

  const response = await axios.get(`https://${host}${path}`, {
    params,
    headers: {
      "x-rapidapi-host": host,
      "x-rapidapi-key": RAPIDAPI_KEY,
    },
    timeout,
  });

  return response.data;
}

module.exports = {
  rapidApiGet,
};
