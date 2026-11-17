const tagQueries = require('../db/queries/tags');
const taskQueries = require('../db/queries/tasks');
const { isUniqueViolation } = require('../db/errors');
const { httpError } = require('../utils/http-error');
const { isNonEmptyString } = require('../utils/validation');

function listTags() {
  return tagQueries.findAllTags();
}

function createTag({ name } = {}) {
  if (!name || !isNonEmptyString(name)) {
    throw httpError(400, 'name is required');
  }
  try {
    const id = tagQueries.insertTag(name.toLowerCase().trim());
    return tagQueries.findTagById(id);
  } catch (err) {
    if (isUniqueViolation(err)) throw httpError(409, 'tag already exists');
    throw err;
  }
}

function applyTagToTask(taskIdParam, { tag_id } = {}) {
  const taskId = parseInt(taskIdParam);
  if (!taskQueries.findTaskById(taskId)) {
    throw httpError(404, 'Task not found');
  }
  if (!tag_id) {
    throw httpError(400, 'tag_id is required');
  }
  const tagId = parseInt(tag_id);
  if (!tagQueries.findTagById(tagId)) {
    throw httpError(404, 'Tag not found');
  }
  try {
    tagQueries.insertTaskTag(taskId, tagId);
  } catch (err) {
    if (isUniqueViolation(err)) throw httpError(409, 'tag already applied to this task');
    throw err;
  }
  return { task_id: taskId, tag_id: tagId };
}

function removeTagFromTask(taskIdParam, tagIdParam) {
  const deleted = tagQueries.deleteTaskTag(parseInt(taskIdParam), parseInt(tagIdParam));
  if (deleted === 0) {
    throw httpError(404, 'Tag not applied to this task');
  }
  return { deleted: true };
}

module.exports = { listTags, createTag, applyTagToTask, removeTagFromTask };
