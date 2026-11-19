const { db } = require('../connection');

// Comments are always returned with their author's name.
const SELECT_WITH_AUTHOR = 'SELECT c.*, u.name as user_name FROM comments c JOIN users u ON u.id = c.user_id';

/**
 * @description Fetches all comments on a task, oldest first, each with its author's name as `user_name`.
 * @param {number} taskId - ID of the task whose comments to fetch.
 * @returns {Object[]} Comment rows including `user_name`; empty if the task has no comments.
 */
function findCommentsForTask(taskId) {
  return db.prepare(`${SELECT_WITH_AUTHOR} WHERE c.task_id = ? ORDER BY c.created_at ASC`).all(taskId);
}

/**
 * @description Fetches a single comment by ID together with its author's name as `user_name`.
 * @param {number} id - ID of the comment.
 * @returns {Object|undefined} The comment row including `user_name`, or `undefined` if none exists.
 */
function findCommentById(id) {
  return db.prepare(`${SELECT_WITH_AUTHOR} WHERE c.id = ?`).get(id);
}

/**
 * @description Inserts a new comment on a task.
 * @param {Object} comment - The comment to insert.
 * @param {number} comment.taskId - ID of the task being commented on.
 * @param {number} comment.userId - ID of the comment's author.
 * @param {string} comment.body - The comment text.
 * @returns {number} The ID of the newly inserted comment.
 */
function insertComment({ taskId, userId, body }) {
  return db.prepare('INSERT INTO comments (task_id, user_id, body) VALUES (?, ?, ?)').run(taskId, userId, body).lastInsertRowid;
}

module.exports = { findCommentsForTask, findCommentById, insertComment };
