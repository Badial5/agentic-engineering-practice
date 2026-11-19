/**
 * @description Checks whether a string has a basic email format (text, `@`, domain, dot, suffix, no whitespace), not full RFC 5322 validation.
 * @param {string} email - The email address to check.
 * @returns {boolean} `true` if `email` matches the expected format, otherwise `false`.
 */
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * @description Checks whether a value is a string containing at least one non-whitespace character.
 * @param {*} val - The value to check; may be of any type.
 * @returns {boolean} `true` if `val` is a string that is not empty or whitespace-only, otherwise `false`.
 */
function isNonEmptyString(val) {
  return typeof val === 'string' && val.trim().length > 0;
}

module.exports = { validateEmail, isNonEmptyString };
