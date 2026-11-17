# Taskr API

A REST API for a simple task management service. Users can create tasks, assign them to projects, mark them complete, add comments, and filter by status.

**Stack:** Node.js · Express · SQLite (via `better-sqlite3`) · Jest

---

## Setup

```bash
npm install
npm run db:seed
npm test
npm run dev
```

The server starts on port 3000. Visit `http://localhost:3000/health` to confirm it's running.

---

## Resources

| Resource | Base path |
|---|---|
| Users | `/users` |
| Projects | `/projects` |
| Tasks | `/tasks` |
| Comments | `/tasks/:id/comments` |
| Tags | `/tags` |

---

## Project structure

```
src/
  app.js          Express app: middleware + routers (exported for tests)
  server.js       Entry point: starts the HTTP server
  config.js       Environment config (PORT, DB_PATH, API_KEY)
  routes/         One router per resource: reads the request, calls a service
  services/       Business logic and validation
  db/
    connection.js Shared SQLite connection
    schema.js     Table definitions (used by the seed script and the tests)
    seed.js       Sample data
    queries/      All SQL, one file per resource
  middleware/     auth, request logging, error handling
  utils/          Small shared helpers (validation, HTTP errors, email stub)
tests/            <resource>.test.js, one per resource
```

A request flows **route → service → query**. Routes hold no SQL or validation, and services know nothing about Express.

---

## npm scripts

| Script | What it does |
|---|---|
| `npm start` | Start the server |
| `npm run dev` | Start with file watching (Node 18+) |
| `npm test` | Run the test suite |
| `npm run db:seed` | Create schema and seed sample data |
| `npm run db:reset` | Drop and re-seed the database |

---

## Database

SQLite — no external database required. The database file (`taskr.db`) is created locally when you run `npm run db:seed`. Sample data includes 5 users, 3 projects, 20 tasks, 15 comments, and 8 tags.

---

## Testing

Tests use Jest and supertest. The test suite runs against an in-memory database — no setup required beyond `npm install`.

```bash
npm test
npm run test:watch
```
