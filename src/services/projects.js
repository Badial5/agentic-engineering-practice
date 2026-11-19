const projectQueries = require('../db/queries/projects');
const taskQueries = require('../db/queries/tasks');
const { httpError } = require('../utils/http-error');
const { isNonEmptyString } = require('../utils/validation');

function requireProject(id) {
  const project = projectQueries.findProjectById(id);
  if (!project) {
    throw httpError(404, 'Project not found');
  }
  return project;
}

function getProjectStats(projectId) {
  const stats = { total: 0, active: 0, completed: 0, archived: 0 };
  for (const row of taskQueries.countTasksByStatusForProject(projectId)) {
    stats[row.status] = row.count;
    stats.total += row.count;
  }
  return stats;
}

/**
 * @description Lists every project, newest first.
 * @returns {Object[]} All project rows.
 */
function listProjects() {
  return projectQueries.findAllProjects();
}

/**
 * @description Fetches a project by ID with task counts per status attached as `stats`.
 * @param {string|number} idParam - The project ID from the route, parsed with `parseInt`.
 * @returns {Object} The project row plus `stats: { total, active, completed, archived }`.
 * @throws {Error & { status: number }} 404 "Project not found".
 */
function getProject(idParam) {
  const id = parseInt(idParam);
  const project = requireProject(id);
  return { ...project, stats: getProjectStats(id) };
}

/**
 * @description Validates and creates a project, returning the stored row.
 * @param {Object} [data={}] - The request body.
 * @param {string} data.name - Project name (required, non-empty).
 * @param {string} [data.description] - Optional description.
 * @param {number} [data.owner_id] - Optional owner's user ID.
 * @returns {Object} The created project row.
 * @throws {Error & { status: number }} 400 "name is required".
 */
function createProject({ name, description, owner_id } = {}) {
  if (!name || !isNonEmptyString(name)) {
    throw httpError(400, 'name is required');
  }
  const id = projectQueries.insertProject({
    name,
    description: description || null,
    ownerId: owner_id || null
  });
  return projectQueries.findProjectById(id);
}

/**
 * @description Partially updates a project, keeping the existing value for any field left `undefined`.
 * @param {string|number} idParam - The project ID from the route, parsed with `parseInt`.
 * @param {Object} [data={}] - The fields to change.
 * @param {string} [data.name] - New name.
 * @param {string} [data.description] - New description.
 * @param {number} [data.owner_id] - New owner's user ID.
 * @returns {Object} The updated project row.
 * @throws {Error & { status: number }} 404 "Project not found".
 */
function updateProject(idParam, data = {}) {
  const id = parseInt(idParam);
  const existing = requireProject(id);
  projectQueries.updateProject(id, {
    name: data.name !== undefined ? data.name : existing.name,
    description: data.description !== undefined ? data.description : existing.description,
    ownerId: data.owner_id !== undefined ? data.owner_id : existing.owner_id
  });
  return projectQueries.findProjectById(id);
}

/**
 * @description Deletes a project by ID.
 * @param {string|number} idParam - The project ID from the route, parsed with `parseInt`.
 * @returns {{ deleted: true }} Confirmation of the deletion.
 * @throws {Error & { status: number }} 404 "Project not found".
 */
function deleteProject(idParam) {
  const deleted = projectQueries.deleteProject(parseInt(idParam));
  if (deleted === 0) {
    throw httpError(404, 'Project not found');
  }
  return { deleted: true };
}

module.exports = { listProjects, getProject, createProject, updateProject, deleteProject };
