const taskQueries = require('../db/queries/tasks');
const projectQueries = require('../db/queries/projects');
const userQueries = require('../db/queries/users');
const tagQueries = require('../db/queries/tags');
const commentQueries = require('../db/queries/comments');
const { httpError } = require('../utils/http-error');
const { isNonEmptyString } = require('../utils/validation');

// Keep in sync with the CHECK constraint on tasks.status in src/db/schema.js.
const VALID_TASK_STATUSES = ['active', 'completed', 'archived'];
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function assertValidStatus(status) {
  if (status && !VALID_TASK_STATUSES.includes(status)) {
    throw httpError(400, `status must be one of: ${VALID_TASK_STATUSES.join(', ')}`);
  }
}

/**
 * @description Lists tasks filtered by status, project and assignee, paginated with a default page size of 20 and a maximum of 100.
 * @param {Object} [query={}] - The request query string.
 * @param {string} [query.status] - Only tasks with this status (`active`, `completed` or `archived`).
 * @param {string} [query.project_id] - Only tasks in this project.
 * @param {string} [query.assignee_id] - Only tasks assigned to this user.
 * @param {string} [query.page] - 1-based page number (default 1).
 * @param {string} [query.page_size] - Tasks per page (default 20, max 100).
 * @returns {Object[]} The matching task rows, newest first.
 * @throws {Error & { status: number }} 400 if `status` is not a valid task status.
 */
function listTasks({ status, project_id, assignee_id, page, page_size } = {}) {
  assertValidStatus(status);

  const limit = Math.min(MAX_PAGE_SIZE, parseInt(page_size) || DEFAULT_PAGE_SIZE);
  const offset = ((parseInt(page) || 1) - 1) * limit;

  return taskQueries.findTasks({
    status: status || undefined,
    projectId: project_id ? parseInt(project_id) : undefined,
    assigneeId: assignee_id ? parseInt(assignee_id) : undefined,
    limit,
    offset
  });
}

/**
 * @description Fetches a single task by ID with its `tags` and `comments` attached.
 * @param {string|number} idParam - The task ID from the route, parsed with `parseInt`.
 * @returns {Object} The task row plus `tags` and `comments` arrays.
 * @throws {Error & { status: number }} 404 "Task not found".
 */
function getTask(idParam) {
  const id = parseInt(idParam);
  const task = taskQueries.findTaskById(id);
  if (!task) {
    throw httpError(404, 'Task not found');
  }
  task.tags = tagQueries.findTagsForTask(id);
  task.comments = commentQueries.findCommentsForTask(id);
  return task;
}

/**
 * @description Validates and creates a task, checking that any referenced project and assignee exist.
 * @param {Object} [data={}] - The request body.
 * @param {string} data.title - Task title (required, non-empty).
 * @param {string} [data.description] - Optional description.
 * @param {string|number} [data.project_id] - Optional project ID (must exist).
 * @param {string|number} [data.assignee_id] - Optional assignee's user ID (must exist).
 * @param {string} [data.due_date] - Optional due date.
 * @returns {Object} The created task row.
 * @throws {Error & { status: number }} 400 if the title is missing or the project or assignee does not exist.
 */
function createTask({ title, description, project_id, assignee_id, due_date } = {}) {
  if (!title || !isNonEmptyString(title)) {
    throw httpError(400, 'title is required');
  }
  if (project_id && !projectQueries.findProjectById(parseInt(project_id))) {
    throw httpError(400, 'project not found');
  }
  if (assignee_id && !userQueries.findUserById(parseInt(assignee_id))) {
    throw httpError(400, 'assignee not found');
  }
  const id = taskQueries.insertTask({
    title,
    description: description || null,
    projectId: project_id ? parseInt(project_id) : null,
    assigneeId: assignee_id ? parseInt(assignee_id) : null,
    dueDate: due_date || null
  });
  return taskQueries.findTaskById(id);
}

/**
 * @description Partially updates a task, keeping unset fields and stamping or clearing `completed_at` on status changes.
 * @param {string|number} idParam - The task ID from the route, parsed with `parseInt`.
 * @param {Object} [data={}] - The fields to change.
 * @param {string} [data.title] - New title.
 * @param {string} [data.description] - New description.
 * @param {string} [data.status] - New status (`active`, `completed` or `archived`).
 * @param {number} [data.project_id] - New project ID.
 * @param {number} [data.assignee_id] - New assignee's user ID.
 * @param {string} [data.due_date] - New due date.
 * @returns {Object} The updated task row.
 * @throws {Error & { status: number }} 404 "Task not found"; 400 if `status` is invalid.
 */
function updateTask(idParam, data = {}) {
  const id = parseInt(idParam);
  const existing = taskQueries.findTaskById(id);
  if (!existing) {
    throw httpError(404, 'Task not found');
  }

  const { title, description, status, project_id, assignee_id, due_date } = data;
  assertValidStatus(status);

  const updatedStatus = status !== undefined ? status : existing.status;
  // Stamp completed_at when a task becomes completed, keep it while it stays
  // completed, and clear it when it moves to any other status.
  const completedAt = updatedStatus === 'completed' && existing.status !== 'completed'
    ? new Date().toISOString()
    : (updatedStatus !== 'completed' ? null : existing.completed_at);

  taskQueries.updateTask(id, {
    title: title !== undefined ? title : existing.title,
    description: description !== undefined ? description : existing.description,
    status: updatedStatus,
    projectId: project_id !== undefined ? project_id : existing.project_id,
    assigneeId: assignee_id !== undefined ? assignee_id : existing.assignee_id,
    dueDate: due_date !== undefined ? due_date : existing.due_date,
    completedAt
  });
  return taskQueries.findTaskById(id);
}

/**
 * @description Deletes a task by ID.
 * @param {string|number} idParam - The task ID from the route, parsed with `parseInt`.
 * @returns {{ deleted: true }} Confirmation of the deletion.
 * @throws {Error & { status: number }} 404 "Task not found".
 */
function deleteTask(idParam) {
  const deleted = taskQueries.deleteTask(parseInt(idParam));
  if (deleted === 0) {
    throw httpError(404, 'Task not found');
  }
  return { deleted: true };
}

module.exports = { VALID_TASK_STATUSES, listTasks, getTask, createTask, updateTask, deleteTask };
