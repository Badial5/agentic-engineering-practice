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
  db.prepare('INSERT INTO tasks (id, title) VALUES (1, ?)').run('Taggable task');
  db.prepare('INSERT INTO tags (id, name) VALUES (1, ?)').run('urgent');
});

// A plain list endpoint: there is no failure case to cover.
describe('GET /tags', () => {
  test('returns all tags sorted by name', async () => {
    db.prepare('INSERT INTO tags (name) VALUES (?)').run('backend');
    const res = await request(app).get('/tags');
    expect(res.status).toBe(200);
    expect(res.body.map(t => t.name)).toEqual(['backend', 'urgent']);
  });
});

describe('POST /tags', () => {
  test('creates a tag, storing its name in lowercase without surrounding spaces', async () => {
    const res = await request(app).post('/tags').send({ name: '  Frontend ' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.name).toBe('frontend');
  });

  test('rejects a tag with no name', async () => {
    const res = await request(app).post('/tags').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('name is required');
  });

  test('rejects a tag that already exists', async () => {
    const res = await request(app).post('/tags').send({ name: 'URGENT' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('tag already exists');
  });
});

describe('POST /tasks/:id/tags', () => {
  test('applies a tag to a task', async () => {
    const res = await request(app).post('/tasks/1/tags').send({ tag_id: 1 });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ task_id: 1, tag_id: 1 });
  });

  test('the applied tag shows up on the task', async () => {
    await request(app).post('/tasks/1/tags').send({ tag_id: 1 });
    const res = await request(app).get('/tasks/1');
    expect(res.status).toBe(200);
    expect(res.body.tags.map(t => t.name)).toEqual(['urgent']);
    expect(res.body.comments).toEqual([]);
  });

  test('returns 404 when the task does not exist', async () => {
    const res = await request(app).post('/tasks/999/tags').send({ tag_id: 1 });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Task not found');
  });

  test('rejects a request with no tag', async () => {
    const res = await request(app).post('/tasks/1/tags').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('tag_id is required');
  });

  test('returns 404 when the tag does not exist', async () => {
    const res = await request(app).post('/tasks/1/tags').send({ tag_id: 999 });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Tag not found');
  });

  test('rejects applying the same tag twice', async () => {
    await request(app).post('/tasks/1/tags').send({ tag_id: 1 });
    const res = await request(app).post('/tasks/1/tags').send({ tag_id: 1 });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('tag already applied to this task');
  });
});

describe('DELETE /tasks/:id/tags/:tagId', () => {
  test('removes a tag from a task', async () => {
    db.prepare('INSERT INTO task_tags (task_id, tag_id) VALUES (1, 1)').run();
    const res = await request(app).delete('/tasks/1/tags/1');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ deleted: true });
    const task = await request(app).get('/tasks/1');
    expect(task.body.tags).toEqual([]);
  });

  test('returns 404 when the tag is not applied to the task', async () => {
    const res = await request(app).delete('/tasks/1/tags/1');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Tag not applied to this task');
  });

  test('returns 404 when the task does not exist', async () => {
    const res = await request(app).delete('/tasks/999/tags/1');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Tag not applied to this task');
  });
});
