// Build an Error carrying an HTTP status, for services to throw and errorHandler to render.

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

module.exports = { httpError };
