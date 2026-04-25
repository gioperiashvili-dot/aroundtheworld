const axios = require("axios");
const { RAPIDAPI_KEY, assertRequiredEnvVars } = require("../config/env");

async function rapidApiGet({ host, path, params, timeout = 20000 }) {
  assertRequiredEnvVars(["RAPIDAPI_KEY"]);

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
