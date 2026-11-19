// Recognise SQLite constraint failures so services can map them to HTTP errors.

/**
 * @description Reports whether an error is a SQLite UNIQUE constraint failure, so services can turn it into a 409.
 * @param {*} err - The error thrown by a better-sqlite3 statement (may be any value).
 * @returns {boolean} `true` if `err` has a message containing "UNIQUE", otherwise `false`.
 */
function isUniqueViolation(err) {
  return Boolean(err && err.message && err.message.includes('UNIQUE'));
}

module.exports = { isUniqueViolation };
