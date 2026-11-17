const userQueries = require('../db/queries/users');
const { isUniqueViolation } = require('../db/errors');
const { httpError } = require('../utils/http-error');
const { isNonEmptyString, validateEmail } = require('../utils/validation');

function listUsers() {
  return userQueries.findAllUsers();
}

function getUser(idParam) {
  const user = userQueries.findUserById(parseInt(idParam));
  if (!user) {
    throw httpError(404, 'User not found');
  }
  return user;
}

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

function deleteUser(idParam) {
  const deleted = userQueries.deleteUser(parseInt(idParam));
  if (deleted === 0) {
    throw httpError(404, 'User not found');
  }
  return { deleted: true };
}

module.exports = { listUsers, getUser, createUser, updateUser, deleteUser };
