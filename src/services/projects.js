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

function listProjects() {
  return projectQueries.findAllProjects();
}

function getProject(idParam) {
  const id = parseInt(idParam);
  const project = requireProject(id);
  return { ...project, stats: getProjectStats(id) };
}

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

function deleteProject(idParam) {
  const deleted = projectQueries.deleteProject(parseInt(idParam));
  if (deleted === 0) {
    throw httpError(404, 'Project not found');
  }
  return { deleted: true };
}

module.exports = { listProjects, getProject, createProject, updateProject, deleteProject };
