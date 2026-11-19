const commentQueries = require('../db/queries/comments');
const taskQueries = require('../db/queries/tasks');
const userQueries = require('../db/queries/users');
const { httpError } = require('../utils/http-error');
const { isNonEmptyString } = require('../utils/validation');

function requireTask(taskIdParam) {
  const taskId = parseInt(taskIdParam);
  if (!taskQueries.findTaskById(taskId)) {
    throw httpError(404, 'Task not found');
  }
  return taskId;
}

/**
 * @description Lists a task's comments, oldest first, throwing 404 if the task does not exist.
 * @param {string|number} taskIdParam - The task ID from the route, parsed with `parseInt`.
 * @returns {Object[]} The task's comments, each including `user_name`.
 * @throws {Error & { status: number }} 404 "Task not found".
 */
function listCommentsForTask(taskIdParam) {
  const taskId = requireTask(taskIdParam);
  return commentQueries.findCommentsForTask(taskId);
}

/**
 * @description Validates and adds a comment to a task, returning the stored comment with its author's name.
 * @param {string|number} taskIdParam - The task ID from the route, parsed with `parseInt`.
 * @param {Object} [data={}] - The request body.
 * @param {string} data.body - Comment text (required, non-empty).
 * @param {string|number} data.user_id - ID of the author (required, must exist).
 * @returns {Object} The created comment row including `user_name`.
 * @throws {Error & { status: number }} 404 if the task is missing; 400 if `body` or `user_id` is missing or the user does not exist.
 */
function createComment(taskIdParam, { user_id, body } = {}) {
  const taskId = requireTask(taskIdParam);
  if (!body || !isNonEmptyString(body)) {
    throw httpError(400, 'body is required');
  }
  if (!user_id) {
    throw httpError(400, 'user_id is required');
  }
  const userId = parseInt(user_id);
  if (!userQueries.findUserById(userId)) {
    throw httpError(400, 'user not found');
  }
  const id = commentQueries.insertComment({ taskId, userId, body });
  return commentQueries.findCommentById(id);
}

module.exports = { listCommentsForTask, createComment };
