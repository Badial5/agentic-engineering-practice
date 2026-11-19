const { db } = require('../connection');

/**
 * @description Fetches every tag, sorted alphabetically by name.
 * @returns {Object[]} All tag rows ordered by `name` ascending.
 */
function findAllTags() {
  return db.prepare('SELECT * FROM tags ORDER BY name ASC').all();
}

/**
 * @description Fetches a single tag by ID.
 * @param {number} id - ID of the tag.
 * @returns {Object|undefined} The tag row, or `undefined` if none exists.
 */
function findTagById(id) {
  return db.prepare('SELECT * FROM tags WHERE id = ?').get(id);
}

/**
 * @description Inserts a new tag with the given name.
 * @param {string} name - The tag name, already normalised by the caller.
 * @returns {number} The ID of the newly inserted tag.
 */
function insertTag(name) {
  return db.prepare('INSERT INTO tags (name) VALUES (?)').run(name).lastInsertRowid;
}

/**
 * @description Fetches all tags applied to a task.
 * @param {number} taskId - ID of the task.
 * @returns {Object[]} Tag rows applied to the task; empty if it has none.
 */
function findTagsForTask(taskId) {
  return db.prepare(
    'SELECT t.* FROM tags t JOIN task_tags tt ON tt.tag_id = t.id WHERE tt.task_id = ?'
  ).all(taskId);
}

/**
 * @description Applies a tag to a task by inserting a `task_tags` row.
 * @param {number} taskId - ID of the task.
 * @param {number} tagId - ID of the tag to apply.
 * @returns {void}
 */
function insertTaskTag(taskId, tagId) {
  db.prepare('INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)').run(taskId, tagId);
}

/**
 * @description Removes a tag from a task by deleting its `task_tags` row.
 * @param {number} taskId - ID of the task.
 * @param {number} tagId - ID of the tag to remove.
 * @returns {number} The number of rows deleted (0 if the tag was not applied, otherwise 1).
 */
function deleteTaskTag(taskId, tagId) {
  return db.prepare('DELETE FROM task_tags WHERE task_id = ? AND tag_id = ?').run(taskId, tagId).changes;
}

module.exports = { findAllTags, findTagById, insertTag, findTagsForTask, insertTaskTag, deleteTaskTag };
