process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../index');
const { db } = require('../DB');
const { createSchema } = require('./schema');

beforeAll(() => {
  createSchema(db);
});

beforeEach(() => {
  db.exec('DELETE FROM task_tags; DELETE FROM comments; DELETE FROM tasks; DELETE FROM projects; DELETE FROM users; DELETE FROM tags;');
  db.prepare('INSERT INTO users (id, name, email) VALUES (1, ?, ?)').run('Test User', 'test@example.com');
  db.prepare('INSERT INTO projects (id, name) VALUES (1, ?)').run('Test Project');
});

describe('GET /tasks', () => {
  test('returns empty array when no tasks', async () => {
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('returns all tasks', async () => {
    db.prepare("INSERT INTO tasks (title, status) VALUES ('Task A', 'active')").run();
    db.prepare("INSERT INTO tasks (title, status) VALUES ('Task B', 'completed')").run();
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  test('filters by ?status=active', async () => {
    db.prepare("INSERT INTO tasks (title, status) VALUES ('Active Task', 'active')").run();
    db.prepare("INSERT INTO tasks (title, status) VALUES ('Done Task', 'completed')").run();
    const res = await request(app).get('/tasks?status=active');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Active Task');
  });

  test('filters by ?status=completed', async () => {
    db.prepare("INSERT INTO tasks (title, status) VALUES ('Active Task', 'active')").run();
    db.prepare("INSERT INTO tasks (title, status) VALUES ('Done Task', 'completed')").run();
    const res = await request(app).get('/tasks?status=completed');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Done Task');
  });

  test('returns 400 for invalid status value', async () => {
    const res = await request(app).get('/tasks?status=invalid');
    expect(res.status).toBe(400);
  });
});

describe('POST /tasks', () => {
  test('creates a task with valid data', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'New Task', description: 'Do the thing' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('New Task');
    expect(res.body.status).toBe('active');
    expect(res.body.id).toBeDefined();
  });

  test('creates a task assigned to a project', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Project Task', project_id: 1 });
    expect(res.status).toBe(201);
    expect(res.body.project_id).toBe(1);
  });

  test('returns 400 when title is missing', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ description: 'No title here' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('returns 400 when title is empty string', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: '   ' });
    expect(res.status).toBe(400);
  });
});

describe('GET /tasks/:id', () => {
  test('returns task by id', async () => {
    const result = db.prepare("INSERT INTO tasks (title) VALUES ('Find Me')").run();
    const res = await request(app).get(`/tasks/${result.lastInsertRowid}`);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Find Me');
    expect(res.body.tags).toBeDefined();
    expect(res.body.comments).toBeDefined();
  });

  test('returns 404 for unknown id', async () => {
    const res = await request(app).get('/tasks/99999');
    expect(res.status).toBe(404);
  });
});

describe('PUT /tasks/:id', () => {
  test('updates task status to completed', async () => {
    const result = db.prepare("INSERT INTO tasks (title, status) VALUES ('Update Me', 'active')").run();
    const taskId = result.lastInsertRowid;
    const res = await request(app)
      .put(`/tasks/${taskId}`)
      .send({ status: 'completed' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
    expect(res.body.completed_at).not.toBeNull();
  });

  test('updates task title', async () => {
    const result = db.prepare("INSERT INTO tasks (title) VALUES ('Old Title')").run();
    const taskId = result.lastInsertRowid;
    const res = await request(app)
      .put(`/tasks/${taskId}`)
      .send({ title: 'New Title' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('New Title');
  });

  test('returns 404 for unknown id', async () => {
    const res = await request(app).put('/tasks/99999').send({ title: 'Ghost' });
    expect(res.status).toBe(404);
  });

  test('returns 400 for invalid status', async () => {
    const result = db.prepare("INSERT INTO tasks (title) VALUES ('Status Test')").run();
    const res = await request(app)
      .put(`/tasks/${result.lastInsertRowid}`)
      .send({ status: 'bogus' });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /tasks/:id', () => {
  test('deletes a task', async () => {
    const result = db.prepare("INSERT INTO tasks (title) VALUES ('Delete Me')").run();
    const taskId = result.lastInsertRowid;
    const res = await request(app).delete(`/tasks/${taskId}`);
    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(true);

    const check = await request(app).get(`/tasks/${taskId}`);
    expect(check.status).toBe(404);
  });

  test('returns 404 when task does not exist', async () => {
    const res = await request(app).delete('/tasks/99999');
    expect(res.status).toBe(404);
  });
});

describe('Task endpoint edge cases', () => {
  test('GET /tasks filters by project and assignee', async () => {
    db.prepare('INSERT INTO tasks (title, project_id, assignee_id) VALUES (?, 1, 1)').run('mine');
    db.prepare('INSERT INTO tasks (title) VALUES (?)').run('other');
    const byProject = await request(app).get('/tasks?project_id=1');
    expect(byProject.body.map(t => t.title)).toEqual(['mine']);
    const byAssignee = await request(app).get('/tasks?assignee_id=1');
    expect(byAssignee.body.map(t => t.title)).toEqual(['mine']);
  });

  test('GET /tasks pages through results, newest first', async () => {
    const insert = db.prepare('INSERT INTO tasks (title, created_at) VALUES (?, ?)');
    for (let i = 1; i <= 5; i++) insert.run(`t${i}`, `2026-01-0${i} 00:00:00`);
    const page1 = await request(app).get('/tasks?page_size=2&page=1');
    expect(page1.body.map(t => t.title)).toEqual(['t5', 't4']);
    const page3 = await request(app).get('/tasks?page_size=2&page=3');
    expect(page3.body.map(t => t.title)).toEqual(['t1']);
  });

  test('GET /tasks returns at most 100 tasks per page', async () => {
    const insert = db.prepare('INSERT INTO tasks (title) VALUES (?)');
    for (let i = 0; i < 105; i++) insert.run(`t${i}`);
    const res = await request(app).get('/tasks?page_size=500');
    expect(res.body).toHaveLength(100);
  });

  test('GET /tasks returns 20 tasks per page by default', async () => {
    const insert = db.prepare('INSERT INTO tasks (title) VALUES (?)');
    for (let i = 0; i < 25; i++) insert.run(`t${i}`);
    const res = await request(app).get('/tasks');
    expect(res.body).toHaveLength(20);
  });

  test('GET /tasks explains which statuses are allowed', async () => {
    const res = await request(app).get('/tasks?status=bogus');
    expect(res.body.error).toBe('status must be one of: active, completed, archived');
  });

  test('POST /tasks rejects a project that does not exist', async () => {
    const res = await request(app).post('/tasks').send({ title: 'Orphan', project_id: 999 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('project not found');
  });

  test('POST /tasks rejects an assignee who does not exist', async () => {
    const res = await request(app).post('/tasks').send({ title: 'Unowned', assignee_id: 999 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('assignee not found');
  });

  test('POST /tasks stores every field it is given', async () => {
    const res = await request(app).post('/tasks').send({
      title: 'Full', description: 'All fields', project_id: 1, assignee_id: 1, due_date: '2026-12-31'
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: 'Full', description: 'All fields', project_id: 1, assignee_id: 1,
      due_date: '2026-12-31', status: 'active', completed_at: null
    });
  });

  test('GET /tasks/:id includes the task comments with author names', async () => {
    db.prepare('INSERT INTO tasks (id, title) VALUES (50, ?)').run('Commented');
    db.prepare('INSERT INTO comments (task_id, user_id, body) VALUES (50, 1, ?)').run('Nice');
    const res = await request(app).get('/tasks/50');
    expect(res.body.comments).toHaveLength(1);
    expect(res.body.comments[0]).toMatchObject({ body: 'Nice', user_name: 'Test User' });
    expect(res.body.tags).toEqual([]);
  });

  test('PUT /tasks/:id records when a task is completed and clears it when reopened', async () => {
    db.prepare('INSERT INTO tasks (id, title) VALUES (60, ?)').run('Lifecycle');
    const done = await request(app).put('/tasks/60').send({ status: 'completed' });
    expect(done.body.completed_at).not.toBeNull();

    const renamed = await request(app).put('/tasks/60').send({ title: 'Still done' });
    expect(renamed.body.completed_at).toBe(done.body.completed_at);

    const reopened = await request(app).put('/tasks/60').send({ status: 'active' });
    expect(reopened.body.completed_at).toBeNull();
  });

  test('PUT /tasks/:id checks the task exists before validating the status', async () => {
    const res = await request(app).put('/tasks/999').send({ status: 'bogus' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Task not found');
  });
});
