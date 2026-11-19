/**
 * @description Express middleware that logs each request's timestamp, method and URL to the console.
 * @param {import('express').Request} req - The incoming request.
 * @param {import('express').Response} res - The response (unused).
 * @param {import('express').NextFunction} next - Called to pass control to the next handler.
 * @returns {void}
 */
function requestLogger(req, res, next) {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
}

module.exports = { requestLogger };
