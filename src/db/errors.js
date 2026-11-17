// Recognise SQLite constraint failures so services can map them to HTTP errors.

function isUniqueViolation(err) {
  return Boolean(err && err.message && err.message.includes('UNIQUE'));
}

module.exports = { isUniqueViolation };
