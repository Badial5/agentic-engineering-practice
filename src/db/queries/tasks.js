const { db } = require('../connection');

/** Filtered, paginated task list, newest first. Falsy filters are ignored. */
function findTasks({ status, projectId, assigneeId, limit, offset }) {
  let query = 'SELECT * FROM tasks';
  const conditions = [];
  const params = [];

  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }
  if (projectId) {
    conditions.push('project_id = ?');
    params.push(projectId);
  }
  if (assigneeId) {
    conditions.push('assignee_id = ?');
    params.push(assigneeId);
  }
  if (conditions.length) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  return db.prepare(query).all(params);
}

function findTaskById(id) {
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
}

function insertTask({ title, description, projectId, assigneeId, dueDate }) {
  return db.prepare(
    'INSERT INTO tasks (title, description, project_id, assignee_id, due_date) VALUES (?, ?, ?, ?, ?)'
  ).run(title, description, projectId, assigneeId, dueDate).lastInsertRowid;
}

function updateTask(id, { title, description, status, projectId, assigneeId, dueDate, completedAt }) {
  db.prepare(
    'UPDATE tasks SET title=?, description=?, status=?, project_id=?, assignee_id=?, due_date=?, completed_at=? WHERE id=?'
  ).run(title, description, status, projectId, assigneeId, dueDate, completedAt, id);
}

/** Returns the number of rows deleted. */
function deleteTask(id) {
  return db.prepare('DELETE FROM tasks WHERE id = ?').run(id).changes;
}

/** Returns rows of { status, count } for one project's tasks. */
function countTasksByStatusForProject(projectId) {
  return db.prepare(
    'SELECT status, COUNT(*) as count FROM tasks WHERE project_id = ? GROUP BY status'
  ).all(projectId);
}

module.exports = {
  findTasks,
  findTaskById,
  insertTask,
  updateTask,
  deleteTask,
  countTasksByStatusForProject
};
