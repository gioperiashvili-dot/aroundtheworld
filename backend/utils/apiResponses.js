function buildSuccessResponse({
  provider,
  results = [],
  alias,
  code,
  message,
  extra = {},
}) {
  const responseBody = {
    ok: true,
    provider,
    results,
    ...extra,
  };

  if (alias) {
    responseBody[alias] = results;
  }

  if (code) {
    responseBody.code = code;
  }

  if (message) {
    responseBody.message = message;
  }

  return responseBody;
}

function buildErrorResponse({
  provider,
  alias,
  code,
  message,
  statusCode = 500,
  extra = {},
}) {
  const responseBody = {
    ok: false,
    provider,
    code,
    message,
    results: [],
    ...extra,
  };

  if (alias) {
    responseBody[alias] = [];
  }

  return {
    statusCode,
    body: responseBody,
  };
}

module.exports = {
  buildErrorResponse,
  buildSuccessResponse,
};
