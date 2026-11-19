const { db } = require('../connection');

/**
 * @description Fetches a filtered, paginated list of tasks, newest first, ignoring any falsy filter.
 * @param {Object} options - Filters and pagination.
 * @param {string} [options.status] - Only tasks with this status.
 * @param {number} [options.projectId] - Only tasks in this project.
 * @param {number} [options.assigneeId] - Only tasks assigned to this user.
 * @param {number} options.limit - Maximum number of rows to return.
 * @param {number} options.offset - Number of rows to skip.
 * @returns {Object[]} The matching task rows.
 */
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

/**
 * @description Fetches a single task by ID.
 * @param {number} id - ID of the task.
 * @returns {Object|undefined} The task row, or `undefined` if none exists.
 */
function findTaskById(id) {
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
}

/**
 * @description Inserts a new task with the default `active` status.
 * @param {Object} task - The task to insert.
 * @param {string} task.title - Task title.
 * @param {?string} task.description - Optional description, or `null`.
 * @param {?number} task.projectId - ID of the project it belongs to, or `null`.
 * @param {?number} task.assigneeId - ID of the assigned user, or `null`.
 * @param {?string} task.dueDate - Due date, or `null`.
 * @returns {number} The ID of the newly inserted task.
 */
function insertTask({ title, description, projectId, assigneeId, dueDate }) {
  return db.prepare(
    'INSERT INTO tasks (title, description, project_id, assignee_id, due_date) VALUES (?, ?, ?, ?, ?)'
  ).run(title, description, projectId, assigneeId, dueDate).lastInsertRowid;
}

/**
 * @description Overwrites every editable column of an existing task.
 * @param {number} id - ID of the task to update.
 * @param {Object} fields - The new column values.
 * @param {string} fields.title - New title.
 * @param {?string} fields.description - New description, or `null`.
 * @param {string} fields.status - New status (`active`, `completed` or `archived`).
 * @param {?number} fields.projectId - New project ID, or `null`.
 * @param {?number} fields.assigneeId - New assignee's user ID, or `null`.
 * @param {?string} fields.dueDate - New due date, or `null`.
 * @param {?string} fields.completedAt - Completion timestamp, or `null`.
 * @returns {void}
 */
function updateTask(id, { title, description, status, projectId, assigneeId, dueDate, completedAt }) {
  db.prepare(
    'UPDATE tasks SET title=?, description=?, status=?, project_id=?, assignee_id=?, due_date=?, completed_at=? WHERE id=?'
  ).run(title, description, status, projectId, assigneeId, dueDate, completedAt, id);
}

/**
 * @description Deletes a task by ID.
 * @param {number} id - ID of the task to delete.
 * @returns {number} The number of rows deleted (0 if the task did not exist, otherwise 1).
 */
function deleteTask(id) {
  return db.prepare('DELETE FROM tasks WHERE id = ?').run(id).changes;
}

/**
 * @description Counts a project's tasks grouped by status.
 * @param {number} projectId - ID of the project.
 * @returns {{ status: string, count: number }[]} One row per status that has at least one task.
 */
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
