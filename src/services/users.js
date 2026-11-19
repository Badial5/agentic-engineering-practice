const userQueries = require('../db/queries/users');
const { isUniqueViolation } = require('../db/errors');
const { httpError } = require('../utils/http-error');
const { isNonEmptyString, validateEmail } = require('../utils/validation');

/**
 * @description Lists every user, newest first.
 * @returns {Object[]} All user rows.
 */
function listUsers() {
  return userQueries.findAllUsers();
}

/**
 * @description Fetches a single user by ID.
 * @param {string|number} idParam - The user ID from the route, parsed with `parseInt`.
 * @returns {Object} The user row.
 * @throws {Error & { status: number }} 404 "User not found".
 */
function getUser(idParam) {
  const user = userQueries.findUserById(parseInt(idParam));
  if (!user) {
    throw httpError(404, 'User not found');
  }
  return user;
}

/**
 * @description Validates and creates a user, rejecting missing fields, malformed emails and duplicate emails.
 * @param {Object} [data={}] - The request body.
 * @param {string} data.name - The user's name (required, non-empty).
 * @param {string} data.email - The user's email address (required, valid, unique).
 * @returns {Object} The created user row.
 * @throws {Error & { status: number }} 400 if name or email is missing or invalid; 409 "email already exists".
 */
function createUser({ name, email } = {}) {
  if (!name || !isNonEmptyString(name)) {
    throw httpError(400, 'name is required');
  }
  if (!email || !isNonEmptyString(email)) {
    throw httpError(400, 'email is required');
  }
  if (!validateEmail(email)) {
    throw httpError(400, 'Invalid email address');
  }
  try {
    const id = userQueries.insertUser({ name, email });
    return userQueries.findUserById(id);
  } catch (err) {
    if (isUniqueViolation(err)) throw httpError(409, 'email already exists');
    throw err;
  }
}

/**
 * @description Partially updates a user, keeping the existing value for any field left `undefined`.
 * @param {string|number} idParam - The user ID from the route, parsed with `parseInt`.
 * @param {Object} [data={}] - The fields to change.
 * @param {string} [data.name] - New name.
 * @param {string} [data.email] - New email address.
 * @returns {Object} The updated user row.
 * @throws {Error & { status: number }} 404 "User not found".
 */
function updateUser(idParam, data = {}) {
  const id = parseInt(idParam);
  const existing = userQueries.findUserById(id);
  if (!existing) {
    throw httpError(404, 'User not found');
  }
  userQueries.updateUser(id, {
    name: data.name !== undefined ? data.name : existing.name,
    email: data.email !== undefined ? data.email : existing.email
  });
  return userQueries.findUserById(id);
}

/**
 * @description Deletes a user by ID.
 * @param {string|number} idParam - The user ID from the route, parsed with `parseInt`.
 * @returns {{ deleted: true }} Confirmation of the deletion.
 * @throws {Error & { status: number }} 404 "User not found".
 */
function deleteUser(idParam) {
  const deleted = userQueries.deleteUser(parseInt(idParam));
  if (deleted === 0) {
    throw httpError(404, 'User not found');
  }
  return { deleted: true };
}

module.exports = { listUsers, getUser, createUser, updateUser, deleteUser };
