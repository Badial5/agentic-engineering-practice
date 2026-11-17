# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Taskr API — a REST API for task management (users, projects, tasks, comments, tags). Node.js · Express 5 · SQLite via `better-sqlite3` (synchronous API) · Jest + supertest. Plain CommonJS, no build step, no linter configured.

This repo is a practice codebase for agentic engineering. All application code lives in `src/`, split into layers: **routes → services → db/queries**. Keep new code inside that structure.

## Never do this

- **Never put SQL outside `src/db/`.** Every `db.prepare(...)` belongs in a `src/db/queries/<resource>.js` function (or in `connection.js`, `schema.js` or `seed.js`).
- **Never put validation or business logic in a route handler.** Handlers read the request, call one service function, and send the response. Errors go to `next(err)`.
- **Never let a service touch Express** (`req`, `res`, `next`, `require('express')`). Services take plain arguments, return plain data, and throw `httpError(status, message)` for client errors.
- **Never put side effects such as email inside a resource service.** They go in a dedicated service (e.g. `src/services/notifications.js`) that the route calls.
- **Never add files outside `src/` (app code) or `tests/` (tests),** and never break the naming conventions below.
- **Never add a circular import or a lazy `require()` inside a function** to work around one.
- **Never add a helper to `src/utils/` without first checking whether it belongs in a more specific module.** Resource logic goes in that resource's service, DB-specific helpers in `src/db/`.

## Context Files

Read the matching file before starting these tasks:

- **Any task involving API routes or endpoints** (adding, changing or moving them): `.claude/contexts/api-conventions.md`
- **Any task involving tests or test coverage**: `.claude/contexts/testing-standards.md`

## Commands

```bash
npm install
npm run db:seed        # create schema + seed taskr.db (no-op if users already exist)
npm run db:reset       # delete taskr.db and re-seed (uses `rm -f`; needs a POSIX shell such as Git Bash on Windows)
npm run dev            # node --watch src/server.js (Node 18+), port 3000 (override with PORT)
npm start
npm test               # all tests
npm run test:watch

npx jest tests/tasks.test.js                     # single file
npx jest tests/tasks.test.js -t "filters by"     # single test by name
```

Health check: `GET http://localhost:3000/health`.

## Folder structure

```
src/
  app.js              builds the Express app and mounts every router; exports app (no listen)
  server.js           entry point: app.listen(config.PORT)
  config.js           PORT, DB_PATH, API_KEY from the environment
  routes/             one router per resource: users, projects, tasks, comments, tags, health, webhooks
  services/           business logic + validation per resource; notifications.js and webhooks.js
  db/
    connection.js     shared better-sqlite3 `db` singleton
    schema.js         createSchema(db), the single schema definition (used by seed AND tests)
    seed.js           `npm run db:seed`
    errors.js         isUniqueViolation(err)
    queries/          users, projects, tasks, comments, tags: the only place SQL lives
  middleware/         auth.js, request-logger.js, error-handler.js
  utils/              validation.js, http-error.js, send-email.js
tests/                <resource>.test.js, one per resource
```

Each layer calls only the layer directly below it:

```
routes/<resource>.js  →  services/<resource>.js  →  db/queries/<resource>.js  →  db/connection.js
```

- **Routes call services.** A handler reads the request, calls one service function, and sends the response or passes errors to `next(err)`. Routes never import queries or the connection.
- **Services call queries.** They hold validation and business rules and may call several query modules (e.g. the tasks service reads tags and comments). They never call `db.prepare` or touch Express.
- **Queries call the database connection.** They are small SQL functions that import `db` from `../connection` and contain no business rules.

## Naming conventions

- **Every file uses kebab-case:** lowercase words joined by hyphens, e.g. `request-logger.js`, `error-handler.js`, `http-error.js`, `send-email.js`. Never camelCase (`requestLogger.js`) or PascalCase (`RequestLogger.js`).
- Route, service and query files are named after the resource, **lowercase and plural**, with the same name in each layer: `routes/tasks.js`, `services/tasks.js`, `db/queries/tasks.js`.
- Test files are `tests/<resource>.test.js` (e.g. `tasks.test.js`).
- Routers are named exports called `<resource>Router` (e.g. `{ tasksRouter }`).

## Architecture notes

- **Mount order in `src/app.js`:** `express.json()`, `requestLogger`, then `/` (health), `/webhooks`, `/users`, `/projects`, `/tasks`, `/tasks/:id/comments`, `/tasks/:id/tags`, `/tags`, and finally `errorHandler`. The nested comment and task-tag routers use `express.Router({ mergeParams: true })` to read `:id`.
- **Errors:** services throw `httpError(status, message)` from `src/utils/http-error.js`. They map SQLite UNIQUE failures to 409 with `isUniqueViolation`. `errorHandler` renders `{ error: message }` with `err.status || 500` and logs stack traces only for 5xx.
- **DB:** `connection.js` uses `:memory:` when `NODE_ENV=test`, otherwise `DB_PATH` or `taskr.db`. Foreign keys are enabled. Schema changes go in `src/db/schema.js` only.
- **Auth** (`src/middleware/auth.js`): `authenticate` checks the `x-api-key` header against `API_KEY` (default `dev-key`). Only `DELETE /users/:id` and `DELETE /projects/:id` are protected.
- **Tasks:** `status` is `active | completed | archived` (`VALID_TASK_STATUSES` in `src/services/tasks.js`, matching the CHECK constraint). `PUT /tasks/:id` manages `completed_at` on status transitions. `GET /tasks` supports `status`, `project_id`, `assignee_id`, `page`, `page_size` (default 20, max 100). `GET /tasks/:id` attaches `tags` and `comments`.
- **Projects:** `GET /projects/:id` adds `stats` (`total`, `active`, `completed`, `archived`).

## Testing

- One file per resource: `tests/<resource>.test.js`. Jest's `testMatch` is `**/tests/*.test.js` only, so a file named any other way is silently skipped.
- Each test file sets `process.env.NODE_ENV = 'test'` **before** requiring `../src/app` and `../src/db/connection`, so the shared `db` is in-memory. Tests call `createSchema(db)` (from `../src/db/schema`) in `beforeAll` and wipe all tables in `beforeEach`.
- Protected endpoints in tests use `.set('x-api-key', 'dev-key')`.

## Repo conventions

- Commits use Conventional Commits. `.claude/commands/commit-push-pr.md` provides a `/commit-push-pr` command (commits staged changes only, pushes, opens a PR via `gh`).
- `.mcp.json` holds local secrets and is git-ignored. Never commit it.
