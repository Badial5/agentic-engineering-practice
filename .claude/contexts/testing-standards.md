# Testing Standards

Follow these rules whenever you write or change tests for the Taskr API, or when you're asked about test coverage.

## File naming

- One file per resource: `tests/<resource>.test.js`, **all lowercase**, using the same plural resource name as the route file. Examples: `tasks.test.js`, `projects.test.js`, `comments.test.js`.
- Don't copy the legacy names `userTest.js` or `test-projects.js`. They're a known inconsistency that will be renamed in the refactor.
- The `.test.js` suffix matters. Jest's `testMatch` in `package.json` only picks up `tests/*.test.js` (plus the two legacy names), so a file named any other way is silently skipped.

## Tools and database

Use **Jest** and **supertest** against an **in-memory SQLite database**. Tests must never need a seeded `taskr.db`, a running server, environment variables, or any other external service.

Every test file starts with this setup:

```js
process.env.NODE_ENV = 'test'; // must come before any require of the app or DB

const request = require('supertest');
const app = require('../index');
const { db } = require('../DB');
const { createSchema } = require('./schema');

beforeAll(() => {
  createSchema(db);
});

beforeEach(() => {
  db.exec('DELETE FROM task_tags; DELETE FROM comments; DELETE FROM tasks; DELETE FROM projects; DELETE FROM users; DELETE FROM tags;');
  // insert only the rows this file needs
});
```

- `NODE_ENV=test` makes `DB.js` open `:memory:`, so setting it first is required.
- Send requests through `request(app)`. Don't call `app.listen()`.
- Insert the data each test needs in `beforeEach` or in the test itself, either with `db.prepare(...)` or through the API. Don't rely on data left behind by another test.
- Protected endpoints need `.set('x-api-key', 'dev-key')`.
- If the schema changes, update `tests/schema.js` to match `db/seed.js`.

## Coverage per endpoint

Each test file covers **every endpoint** of its resource. For each endpoint, write:

- **The happy path**: a valid request returns the expected status code and body. Assert on the response fields, not just the status.
- **At least two error cases.** Pick from those that apply:
  - a required field is missing or empty → `400`
  - an invalid value (e.g. a bad `status`) → `400`
  - a referenced row (project, user, tag) doesn't exist → `400` or `404`
  - an unknown `:id` → `404`
  - a duplicate that breaks a unique constraint → `409`
  - a missing or wrong `x-api-key` on a protected endpoint → `401`

For error cases, check both the status code and that `res.body.error` is present. If an endpoint really has fewer than two possible failures (for example, a plain list endpoint), cover the ones it has. Then add a comment above the `describe` block saying so, rather than inventing cases.

Group the tests with one `describe` per endpoint, named after the method and path:

```js
describe('POST /tasks', () => {
  test('creates a task and returns it with status active', async () => { /* ... */ });
  test('rejects a task with no title', async () => { /* ... */ });
  test('rejects a task assigned to a project that does not exist', async () => { /* ... */ });
});
```

## Test descriptions

Write test names in plain English that describe **what the endpoint does from the client's point of view**, not how it's implemented.

| Good | Bad |
|---|---|
| `returns 404 when the task does not exist` | `getTaskById returns null` |
| `marks the task completed and records when it was completed` | `sets completed_at via UPDATE` |
| `rejects an email that is already registered` | `catches UNIQUE constraint error` |

Don't mention function names, SQL, or internal modules in descriptions.

## Running

The whole suite has to pass with only:

```bash
npm install
npm test
```

Don't add tests that need seeding, a `.env` file, network access, or a particular order across files. To run part of the suite:

```bash
npx jest tests/tasks.test.js
npx jest tests/tasks.test.js -t "returns 404"
```
