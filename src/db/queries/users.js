const { db } = require('../connection');

/**
 * @description Fetches every user, newest first.
 * @returns {Object[]} All user rows ordered by `created_at` descending.
 */
function findAllUsers() {
  return db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
}

/**
 * @description Fetches a single user by ID.
 * @param {number} id - ID of the user.
 * @returns {Object|undefined} The user row, or `undefined` if none exists.
 */
function findUserById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

/**
 * @description Inserts a new user.
 * @param {Object} user - The user to insert.
 * @param {string} user.name - The user's name.
 * @param {string} user.email - The user's email address (must be unique).
 * @returns {number} The ID of the newly inserted user.
 */
function insertUser({ name, email }) {
  return db.prepare('INSERT INTO users (name, email) VALUES (?, ?)').run(name, email).lastInsertRowid;
}

/**
 * @description Overwrites the name and email of an existing user.
 * @param {number} id - ID of the user to update.
 * @param {Object} fields - The new column values.
 * @param {string} fields.name - New name.
 * @param {string} fields.email - New email address.
 * @returns {void}
 */
function updateUser(id, { name, email }) {
  db.prepare('UPDATE users SET name = ?, email = ? WHERE id = ?').run(name, email, id);
}

/**
 * @description Deletes a user by ID.
 * @param {number} id - ID of the user to delete.
 * @returns {number} The number of rows deleted (0 if the user did not exist, otherwise 1).
 */
function deleteUser(id) {
  return db.prepare('DELETE FROM users WHERE id = ?').run(id).changes;
}

module.exports = { findAllUsers, findUserById, insertUser, updateUser, deleteUser };
