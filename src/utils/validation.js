/**
 * Checks whether a value looks like an email address: some text, an `@`,
 * a domain, a dot and a suffix, with no whitespace. This is a basic format
 * check, not full RFC 5322 validation.
 *
 * @param {string} email - The email address to check.
 * @returns {boolean} `true` if `email` matches the expected format, otherwise `false`.
 */
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Checks whether a value is a string containing at least one
 * non-whitespace character.
 *
 * @param {*} val - The value to check; may be of any type.
 * @returns {boolean} `true` if `val` is a string that is not empty or
 *   whitespace-only, otherwise `false`.
 */
function isNonEmptyString(val) {
  return typeof val === 'string' && val.trim().length > 0;
}

module.exports = { validateEmail, isNonEmptyString };
