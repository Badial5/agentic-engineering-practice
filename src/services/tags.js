const tagQueries = require('../db/queries/tags');
const taskQueries = require('../db/queries/tasks');
const { isUniqueViolation } = require('../db/errors');
const { httpError } = require('../utils/http-error');
const { isNonEmptyString } = require('../utils/validation');

/**
 * @description Lists every tag in alphabetical order.
 * @returns {Object[]} All tag rows.
 */
function listTags() {
  return tagQueries.findAllTags();
}

/**
 * @description Validates and creates a tag, storing its name lowercased and trimmed.
 * @param {Object} [data={}] - The request body.
 * @param {string} data.name - Tag name (required, non-empty).
 * @returns {Object} The created tag row.
 * @throws {Error & { status: number }} 400 "name is required"; 409 "tag already exists".
 */
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

/**
 * @description Applies an existing tag to an existing task.
 * @param {string|number} taskIdParam - The task ID from the route, parsed with `parseInt`.
 * @param {Object} [data={}] - The request body.
 * @param {string|number} data.tag_id - ID of the tag to apply (required).
 * @returns {{ task_id: number, tag_id: number }} The pair that was linked.
 * @throws {Error & { status: number }} 404 if the task or tag is missing; 400 if `tag_id` is missing; 409 if already applied.
 */
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

/**
 * @description Removes a tag from a task.
 * @param {string|number} taskIdParam - The task ID from the route, parsed with `parseInt`.
 * @param {string|number} tagIdParam - The tag ID from the route, parsed with `parseInt`.
 * @returns {{ deleted: true }} Confirmation of the removal.
 * @throws {Error & { status: number }} 404 "Tag not applied to this task".
 */
function removeTagFromTask(taskIdParam, tagIdParam) {
  const deleted = tagQueries.deleteTaskTag(parseInt(taskIdParam), parseInt(tagIdParam));
  if (deleted === 0) {
    throw httpError(404, 'Tag not applied to this task');
  }
  return { deleted: true };
}

module.exports = { listTags, createTag, applyTagToTask, removeTagFromTask };
