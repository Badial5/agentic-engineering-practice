# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Taskr API — a REST API for task management (users, projects, tasks, comments, tags). Node.js · Express 5 · SQLite via `better-sqlite3` (synchronous API) · Jest + supertest. Plain CommonJS, no build step, no linter configured.

This repo is a practice codebase for agentic engineering. **Its structural problems are intentional** and will be fixed in a future refactor; the `TODO` comments (especially at the top of `routes.js`) mark the planned direction. Understand the current state as described below, but don't reinforce the bad patterns in new code:

- Don't add more inline SQL or inline validation to route handlers.
- Don't add new circular imports or more lazy-`require()` workarounds.
- Don't put helpers in the wrong place (e.g. queries in `DB.js`) or add files with inconsistent names (`get-tasks.js`, `UserController.js`, `userTest.js` style mixing).
- Don't add side effects such as email to controllers.

Don't start a large restructuring unprompted either: the refactor is planned work. Keep changes scoped to the task, and point out a bad pattern when the task touches it.

## Never do this

- **Never add new route logic to `routes.js`.** It is already too large. Any new route belongs in a dedicated route file (one per resource) in `src/routes/`, registered with `app.use`. See `.claude/contexts/api-conventions.md`.
- **Never add a new utility function to `utils.js` without first checking whether it belongs in a more specific module** (e.g. task-specific logic alongside the task code, validation in a validation module).
- **Never import from files in the `misc/` directory.** That code is dead and scheduled for removal. Don't copy from it either. Exception: `misc/constants.js` is still imported by `index.js` and `routes.js`. Leave those existing imports alone, but don't add new ones. Put new constants somewhere outside `misc/`.

## Context Files

Read the matching file before starting these tasks:

- **Any task involving API routes or endpoints** (adding, changing or moving them): `.claude/contexts/api-conventions.md`
- **Any task involving tests or test coverage**: `.claude/contexts/testing-standards.md`

## Commands

```bash
npm install
npm run db:seed        # create schema + seed taskr.db (no-op if users already exist)
npm run db:reset       # delete taskr.db and re-seed (uses `rm -f`; needs a POSIX shell such as Git Bash on Windows)
npm run dev            # node --watch (Node 18+), port 3000 (override with PORT)
npm start
npm test               # all tests
npm run test:watch

npx jest tests/tasks.test.js                     # single file
npx jest tests/tasks.test.js -t "filters by"     # single test by name
```

Health check: `GET http://localhost:3000/health`.

## Architecture

- **`index.js`** builds the Express app, mounts `routes.js`, and only calls `listen()` when run directly (`require.main === module`) — tests import the app without starting a server. A couple of routes (`/`, `/webhooks/task-update`) are defined directly in `index.js`, not in `routes.js`.
- **`DB.js`** exports a single shared `db` connection (module singleton). It uses `:memory:` when `NODE_ENV=test`, otherwise `DB_PATH` or `taskr.db`. Foreign keys are enabled.
- **`routes.js`** holds every resource route in one file. Most handlers run SQL inline with `db.prepare(...)` and do validation inline — there is no service/repository layer. Exceptions to that pattern:
  - Users delegate to `UserController.js` (which throws errors carrying a `.status` that the route maps to the response; `createUser` also sends a welcome email via the stubbed `sendEmail.js`).
  - Task list/detail reads go through `get-tasks.js` (`getTaskById` attaches `tags` and `comments`).
  - Project stats come from `projectHelpers.js`.
- **Circular dependency:** `routes.js` ↔ `projectHelpers.js`. Both sides use lazy `require()` inside functions to avoid load-time cycles — preserve that if touching either file.
- **Auth** (`auth.js`): `authenticate` middleware checks the `x-api-key` header against `API_KEY` (default `dev-key`). Only `DELETE /users/:id` and `DELETE /projects/:id` are protected.
- **Schema** lives in `db/seed.js` and is **duplicated** in `tests/schema.js`. Any schema change must be made in both. Task `status` is constrained to `active | completed | archived` (also `VALID_TASK_STATUSES` in `misc/constants.js`); `PUT /tasks/:id` manages `completed_at` when status transitions.
- `GET /tasks` supports `status`, `project_id`, `assignee_id`, `page`, `page_size` (max 100).
- `misc/oldRoutes.js` and `misc/temp.js` are dead code (not imported anywhere).

## Testing

- Each test file sets `process.env.NODE_ENV = 'test'` **before** requiring `../index` / `../DB`, so the shared `db` is in-memory. Tests call `createSchema(db)` in `beforeAll` and wipe all tables in `beforeEach`.
- Name test files `<resource>.test.js` (e.g. `tasks.test.js`, `comments.test.js`). The current inconsistent names (`userTest.js`, `test-projects.js`) are a known problem and will be standardized in the refactor. Don't copy them.
- Jest only runs files matching `testMatch` in `package.json`: `tests/*.test.js`, plus those two legacy names listed explicitly. A file named any other way is silently skipped.
- Protected endpoints in tests use `.set('x-api-key', 'dev-key')`.

## Repo conventions

- Commits use Conventional Commits. `.claude/commands/commit-push-pr.md` provides a `/commit-push-pr` command (commits staged changes only, pushes, opens a PR via `gh`).
