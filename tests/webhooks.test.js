process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../index');

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

// The webhook accepts any payload, so the only failure case is a malformed body.
describe('POST /webhooks/task-update', () => {
  test('acknowledges the webhook', async () => {
    const res = await request(app).post('/webhooks/task-update').send({ task_id: 1, status: 'completed' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
  });

  test('acknowledges a webhook with an empty payload', async () => {
    const res = await request(app).post('/webhooks/task-update').send({});
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
  });

  test('rejects a body that is not valid JSON', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await request(app)
      .post('/webhooks/task-update')
      .set('Content-Type', 'application/json')
      .send('{not json');
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});
