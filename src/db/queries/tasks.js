const { db } = require('../connection');

function findTaskById(id) {
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
}

/** Returns rows of { status, count } for one project's tasks. */
function countTasksByStatusForProject(projectId) {
  return db.prepare(
    'SELECT status, COUNT(*) as count FROM tasks WHERE project_id = ? GROUP BY status'
  ).all(projectId);
}

module.exports = { findTaskById, countTasksByStatusForProject };
