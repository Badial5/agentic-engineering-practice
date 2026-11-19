const { db } = require('../connection');

/**
 * @description Fetches every project, newest first.
 * @returns {Object[]} All project rows ordered by `created_at` descending.
 */
function findAllProjects() {
  return db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
}

/**
 * @description Fetches a single project by ID.
 * @param {number} id - ID of the project.
 * @returns {Object|undefined} The project row, or `undefined` if none exists.
 */
function findProjectById(id) {
  return db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
}

/**
 * @description Inserts a new project.
 * @param {Object} project - The project to insert.
 * @param {string} project.name - Project name.
 * @param {?string} project.description - Optional description, or `null`.
 * @param {?number} project.ownerId - ID of the owning user, or `null`.
 * @returns {number} The ID of the newly inserted project.
 */
function insertProject({ name, description, ownerId }) {
  return db.prepare(
    'INSERT INTO projects (name, description, owner_id) VALUES (?, ?, ?)'
  ).run(name, description, ownerId).lastInsertRowid;
}

/**
 * @description Overwrites the name, description and owner of an existing project.
 * @param {number} id - ID of the project to update.
 * @param {Object} fields - The new column values.
 * @param {string} fields.name - New project name.
 * @param {?string} fields.description - New description, or `null`.
 * @param {?number} fields.ownerId - New owner's user ID, or `null`.
 * @returns {void}
 */
function updateProject(id, { name, description, ownerId }) {
  db.prepare(
    'UPDATE projects SET name = ?, description = ?, owner_id = ? WHERE id = ?'
  ).run(name, description, ownerId, id);
}

/**
 * @description Deletes a project by ID.
 * @param {number} id - ID of the project to delete.
 * @returns {number} The number of rows deleted (0 if the project did not exist, otherwise 1).
 */
function deleteProject(id) {
  return db.prepare('DELETE FROM projects WHERE id = ?').run(id).changes;
}

module.exports = { findAllProjects, findProjectById, insertProject, updateProject, deleteProject };
