// Turns errors passed to next() into JSON: { error: message } with err.status (default 500).

/**
 * @description Express error handler that responds with `{ error: message }` and `err.status` (default 500), logging the stack for 5xx errors.
 * @param {Error & { status?: number }} err - The error passed to `next(err)`.
 * @param {import('express').Request} req - The request that failed.
 * @param {import('express').Response} res - The response to send the error on.
 * @param {import('express').NextFunction} next - Unused, but required so Express treats this as an error handler.
 * @returns {void}
 */
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  if (status >= 500) {
    console.error(err.stack || err);
  }
  res.status(status).json({ error: err.message || 'Internal server error' });
}

module.exports = { errorHandler };
