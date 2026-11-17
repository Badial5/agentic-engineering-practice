const { db } = require('../connection');

// Comments are always returned with their author's name.
const SELECT_WITH_AUTHOR = 'SELECT c.*, u.name as user_name FROM comments c JOIN users u ON u.id = c.user_id';

function findCommentsForTask(taskId) {
  return db.prepare(`${SELECT_WITH_AUTHOR} WHERE c.task_id = ? ORDER BY c.created_at ASC`).all(taskId);
}

function findCommentById(id) {
  return db.prepare(`${SELECT_WITH_AUTHOR} WHERE c.id = ?`).get(id);
}

function insertComment({ taskId, userId, body }) {
  return db.prepare('INSERT INTO comments (task_id, user_id, body) VALUES (?, ?, ?)').run(taskId, userId, body).lastInsertRowid;
}

module.exports = { findCommentsForTask, findCommentById, insertComment };
