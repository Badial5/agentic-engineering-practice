// Turns errors passed to next() into JSON: { error: message } with err.status (default 500).

function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  if (status >= 500) {
    console.error(err.stack || err);
  }
  res.status(status).json({ error: err.message || 'Internal server error' });
}

module.exports = { errorHandler };
