process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../src/app');

// These endpoints have no inputs and cannot fail, so only the happy path is covered.
describe('GET /', () => {
  test('describes the API', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ name: 'Taskr API', version: '1.0.0', docs: '/health' });
  });
});

describe('GET /health', () => {
  test('reports that the API is up, with the current time', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(new Date(res.body.timestamp).toISOString()).toBe(res.body.timestamp);
  });
});
