// TODO: replace with real JWT validation
const { API_KEY } = require('../config');

/**
 * @description Express middleware that lets a request through only if its `x-api-key` header matches the configured API key, otherwise responding 401.
 * @param {import('express').Request} req - The incoming request.
 * @param {import('express').Response} res - The response, used to send 401 `{ error: 'Unauthorized' }`.
 * @param {import('express').NextFunction} next - Called to continue when the key is valid.
 * @returns {void}
 */
function authenticate(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (apiKey === API_KEY) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
}

module.exports = { authenticate };
