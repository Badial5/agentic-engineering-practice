# Contributing to Taskr API

Thanks for contributing. This guide covers getting set up, the conventions we follow, and the checks every change must pass before it's committed.

For architecture rules (layering, naming, where SQL and validation live), see [CLAUDE.md](CLAUDE.md). The short version: requests flow **route → service → db/queries**. App code goes in `src/` and tests go in `tests/`. Every file name is kebab-case.

---

## 1. Setting up the development environment

### Prerequisites

- **Node.js 20 or newer.** `better-sqlite3` v12 supports Node 20.x–26.x, and `npm run dev` uses `node --watch`.
- **npm** (ships with Node).
- **Git.**
- **A POSIX shell for `npm run db:reset`.** The script uses `rm -f`, so on Windows run it from Git Bash, not PowerShell or cmd.
- **Optional:** the [GitHub CLI](https://cli.github.com/) (`gh`) if you want to open pull requests from the terminal or use `/commit-push-pr`.

You don't need an external database. SQLite runs in-process, and the database file is created locally.

### Steps

```bash
git clone <repo-url>
cd agentic-engineering-practice
npm install
npm run db:seed
npm test
npm run dev
```

| Step | What it does |
|---|---|
| `npm install` | Installs dependencies from `package-lock.json`, including the native `better-sqlite3` binary. |
| `npm run db:seed` | Creates the schema and seeds `taskr.db` with sample data (5 users, 3 projects, 20 tasks, 15 comments, 8 tags). Does nothing if users already exist. |
| `npm test` | Confirms everything works before you change anything. See [section 3](#3-running-the-test-suite). |
| `npm run dev` | Starts the server with file watching on port 3000. |

Check that the server is up:

```bash
curl http://localhost:3000/health
```

### Configuration

All settings come from environment variables in `src/config.js`. The defaults work for local development.

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `DB_PATH` | `taskr.db` | SQLite file path. Ignored when `NODE_ENV=test`, where an in-memory DB is used. |
| `API_KEY` | `dev-key` | Value expected in the `x-api-key` header for `DELETE /users/:id` and `DELETE /projects/:id` |

### Resetting local data

```bash
npm run db:reset
```

This deletes `taskr.db` (and its `-shm`/`-wal` files) and re-seeds it. `taskr.db*` is git-ignored, and so is `.mcp.json`, which holds local secrets. Never commit either.

---

## 2. Commit message convention

We use **[Conventional Commits](https://www.conventionalcommits.org/)**:

```
<type>(<optional scope>): <short summary>

<optional body: what changed and why>
```

- **Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`
- **Scope** (optional): the area touched, such as `tasks`, `projects`, `db`, `utils`, `src`, or `claude`
- **Summary:** imperative mood, lowercase, no trailing period, under about 72 characters
- **Body:** add one after a blank line when the change needs explaining

Examples from this repo's history:

```
docs(claude): add /verify-app command and verification rule
docs(src): add complete JSDoc to all exported functions
chore: add package-lock.json for reproducible installs
```

More examples:

```
feat(tasks): support filtering by tag
fix(projects): return 404 when project does not exist
test(comments): cover empty-body validation
```

### Using `/commit-push-pr` (Claude Code)

If you use Claude Code, the `/commit-push-pr` command (`.claude/commands/commit-push-pr.md`):

1. Commits **only what you've staged** and writes a Conventional Commits message from the staged diff. It never stages files for you.
2. Pushes the current branch, but stops to ask first if you're on `main`/`master`.
3. Opens a PR with `gh pr create --fill`.

Stage your changes yourself, and run the tests first (see [section 5](#5-never-commit-with-failing-tests)).

---

## 3. Running the test suite

Tests use **Jest** and **supertest**. They send real HTTP requests through the Express app (`src/app.js`) against an **in-memory SQLite database**. You don't need a running server, a seeded `taskr.db`, or any environment variables.

```bash
npm test                                         # all tests
npm test -- --runInBand                          # all tests, serially (what /verify-app runs)
npm run test:watch                               # re-run on file changes
npx jest tests/tasks.test.js                     # a single file
npx jest tests/tasks.test.js -t "filters by"     # a single test by name
```

`--runInBand` runs test files one after another in a single process, so they don't compete for the shared in-memory database. Use it for your final pre-commit run.

### What a passing run looks like

The output includes `console.log` lines from the request logger (for example `[2026-…] GET /health`). That's expected noise, not a failure. What matters is the summary at the end:

```
PASS tests/webhooks.test.js

Test Suites: 7 passed, 7 total
Tests:       87 passed, 87 total
Snapshots:   0 total
Time:        5.282 s
Ran all test suites.
```

A passing run means:

- Every suite shows `PASS`, with no `FAIL` lines.
- `Test Suites` and `Tests` both read **N passed, N total**, with no `failed` count.
- The process exits with code 0.

There are 7 suites today, one per resource: `users`, `projects`, `tasks`, `comments`, `tags`, `health`, and `webhooks`. The exact test count goes up as tests are added.

### Writing tests

- One file per resource: `tests/<resource>.test.js`. Jest only matches `**/tests/*.test.js`, so a file named any other way **is silently skipped**.
- Set `process.env.NODE_ENV = 'test'` **before** requiring `../src/app` and `../src/db/connection`.
- Call `createSchema(db)` in `beforeAll` and wipe all tables in `beforeEach`.
- Use `.set('x-api-key', 'dev-key')` for protected endpoints.

See `.claude/contexts/testing-standards.md` for the full standards.

---

## 4. The `/verify-app` command

`/verify-app` is a Claude Code command (`.claude/commands/verify-app.md`) that checks the whole API end to end.

### What it does

1. Runs `npm test -- --runInBand`.
2. If anything fails, it finds the cause in `src/` (following route → service → db/queries) and **fixes the implementation, not the test**. The tests are treated as the specification. A test is changed only if it is clearly wrong, and the report says so explicitly.
3. Re-runs the full suite after each fix, because a fix in one place can break another.
4. Stops and reports instead of continuing if the same failure survives three fix attempts, or if the fix needs a large redesign or a schema change.
5. Reports either `✅ All N tests passing across M suites — all endpoints verified` (plus any fixes made) or `❌ X of N tests failing` with details for each failure.

### When to run it

Run it **after any significant change, before committing**. For example:

- adding, changing, or removing an endpoint
- changing a service's validation or business rules
- touching queries or `src/db/schema.js`
- refactoring across layers, or moving or renaming modules
- updating dependencies

If you don't use Claude Code, run the same check by hand:

```bash
npm test -- --runInBand
```

---

## 5. Never commit with failing tests

**Do not commit if any test is failing.** No exceptions for "I'll fix it in the next commit."

Before every commit:

1. Run `npm test -- --runInBand` (or `/verify-app`).
2. Confirm the summary shows every suite and every test passed.
3. Only then stage and commit.

If a test fails:

- Fix the **implementation** so the test passes. Don't weaken, skip (`.skip`, `xit`), or delete the test to get green.
- If you truly believe a test is wrong (it contradicts documented API behaviour), fix the test in its own clearly described change and explain why in the commit body.
- If you can't get the suite green, don't commit. Ask for help or open a draft discussion with the failure output.

---

## Pull request checklist

- [ ] `npm test -- --runInBand` passes (or `/verify-app` reports ✅)
- [ ] Commits follow Conventional Commits
- [ ] Code follows the layering and naming rules in [CLAUDE.md](CLAUDE.md)
- [ ] New behaviour has tests in the matching `tests/<resource>.test.js`
- [ ] No secrets, `.mcp.json`, or `taskr.db` files committed
