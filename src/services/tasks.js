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

/** A single task with its tags and comments attached. */
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

function deleteTask(idParam) {
  const deleted = taskQueries.deleteTask(parseInt(idParam));
  if (deleted === 0) {
    throw httpError(404, 'Task not found');
  }
  return { deleted: true };
}

module.exports = { VALID_TASK_STATUSES, listTasks, getTask, createTask, updateTask, deleteTask };
