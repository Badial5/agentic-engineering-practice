// Build an Error carrying an HTTP status, for services to throw and errorHandler to render.

/**
 * @description Creates an Error carrying an HTTP status code, which services throw and the error handler renders as `{ error: message }`.
 * @param {number} status - HTTP status code for the response (e.g. 400, 404, 409).
 * @param {string} message - Error message sent to the client.
 * @returns {Error & { status: number }} A new Error whose `message` is `message` and whose `status` property is `status`.
 */
function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

module.exports = { httpError };
