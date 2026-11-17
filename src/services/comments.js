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

function listCommentsForTask(taskIdParam) {
  const taskId = requireTask(taskIdParam);
  return commentQueries.findCommentsForTask(taskId);
}

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
