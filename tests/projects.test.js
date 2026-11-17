process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../src/app');
const { db } = require('../src/db/connection');
const { createSchema } = require('../src/db/schema');

beforeAll(() => {
  createSchema(db);
});

beforeEach(() => {
  db.exec('DELETE FROM task_tags; DELETE FROM comments; DELETE FROM tasks; DELETE FROM projects; DELETE FROM users; DELETE FROM tags;');
  db.prepare('INSERT INTO users (id, name, email) VALUES (1, ?, ?)').run('Project Owner', 'owner@test.com');
});

describe('Project endpoints', () => {
  test('POST /projects creates a project', async () => {
    const res = await request(app)
      .post('/projects')
      .send({ name: 'My Project', description: 'A test project', owner_id: 1 });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('My Project');
    expect(res.body.id).toBeDefined();
  });

  test('POST /projects returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/projects')
      .send({ description: 'No name' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('GET /projects returns all projects', async () => {
    await request(app).post('/projects').send({ name: 'Alpha' });
    await request(app).post('/projects').send({ name: 'Beta' });
    const res = await request(app).get('/projects');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  test('GET /projects/:id returns project with stats', async () => {
    const created = await request(app)
      .post('/projects')
      .send({ name: 'Stats Project' });
    const projectId = created.body.id;

    await request(app).post('/tasks').send({ title: 'Active task', project_id: projectId });
    await request(app).post('/tasks').send({ title: 'Another active', project_id: projectId });

    const res = await request(app).get(`/projects/${projectId}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Stats Project');
    expect(res.body.stats).toBeDefined();
    expect(res.body.stats.total).toBe(2);
    expect(res.body.stats.active).toBe(2);
  });

  test('GET /projects/:id returns 404 for unknown project', async () => {
    const res = await request(app).get('/projects/99999');
    expect(res.status).toBe(404);
  });

  test('tasks can be assigned to a project', async () => {
    const proj = await request(app).post('/projects').send({ name: 'Assignment Test' });
    const projectId = proj.body.id;

    await request(app).post('/tasks').send({ title: 'Task in project', project_id: projectId });
    await request(app).post('/tasks').send({ title: 'Unassigned task' });

    const res = await request(app).get(`/tasks?project_id=${projectId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Task in project');
  });

  test('PUT /projects/:id updates a project', async () => {
    const created = await request(app)
      .post('/projects')
      .send({ name: 'Old Name' });
    const res = await request(app)
      .put(`/projects/${created.body.id}`)
      .send({ name: 'New Name', description: 'Updated desc' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('New Name');
    expect(res.body.description).toBe('Updated desc');
  });

  test('DELETE /projects/:id removes a project', async () => {
    const created = await request(app).post('/projects').send({ name: 'Doomed Project' });
    const projectId = created.body.id;

    const res = await request(app)
      .delete(`/projects/${projectId}`)
      .set('x-api-key', 'dev-key');
    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(true);

    const check = await request(app).get(`/projects/${projectId}`);
    expect(check.status).toBe(404);
  });
});

describe('Project endpoint error cases', () => {
  test('GET /projects/:id reports zero stats for a project with no tasks', async () => {
    db.prepare('INSERT INTO projects (id, name) VALUES (7, ?)').run('Empty');
    const res = await request(app).get('/projects/7');
    expect(res.status).toBe(200);
    expect(res.body.stats).toEqual({ total: 0, active: 0, completed: 0, archived: 0 });
  });

  test('GET /projects/:id counts tasks by status', async () => {
    db.prepare('INSERT INTO projects (id, name) VALUES (8, ?)').run('Busy');
    const insert = db.prepare('INSERT INTO tasks (title, status, project_id) VALUES (?, ?, 8)');
    insert.run('a', 'active');
    insert.run('b', 'active');
    insert.run('c', 'completed');
    insert.run('d', 'archived');
    const res = await request(app).get('/projects/8');
    expect(res.body.stats).toEqual({ total: 4, active: 2, completed: 1, archived: 1 });
  });

  test('PUT /projects/:id keeps fields that are not sent', async () => {
    db.prepare('INSERT INTO projects (id, name, description, owner_id) VALUES (9, ?, ?, 1)').run('Original', 'Keep this');
    const res = await request(app).put('/projects/9').send({ name: 'Renamed' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Renamed');
    expect(res.body.description).toBe('Keep this');
    expect(res.body.owner_id).toBe(1);
  });

  test('PUT /projects/:id returns 404 when the project does not exist', async () => {
    const res = await request(app).put('/projects/999').send({ name: 'Nothing' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Project not found');
  });

  test('DELETE /projects/:id requires an API key', async () => {
    db.prepare('INSERT INTO projects (id, name) VALUES (10, ?)').run('Protected');
    const res = await request(app).delete('/projects/10');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  test('DELETE /projects/:id returns 404 when the project does not exist', async () => {
    const res = await request(app).delete('/projects/999').set('x-api-key', 'dev-key');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Project not found');
  });

  test('POST /projects rejects a blank name', async () => {
    const res = await request(app).post('/projects').send({ name: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('name is required');
  });
});
