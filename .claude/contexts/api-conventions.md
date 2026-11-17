# API Conventions: Adding a New Endpoint

Follow these rules whenever you add or change an API route or endpoint in the Taskr API.

## Where things go

| Piece | Location | Example for a `comments` resource |
|---|---|---|
| Routes | `src/routes/<resource>.js` | `src/routes/comments.js` |
| Business logic and validation | `src/services/<resource>.js` | `src/services/comments.js` |
| SQL | `src/db/queries/<resource>.js` | `src/db/queries/comments.js` |
| Router registration | `src/app.js` | `app.use('/tasks/:id/comments', commentsRouter)` |

- The filename is the **resource name, lowercase and plural**: `tasks.js`, `projects.js`, `tags.js`. Multi-word names are kebab-case (`task-tags.js`). Never `taskRoutes.js`, `Task.js` or `getTasks.js`.
- The layers only call downward: **route → service → queries**. Routes never import queries, and queries never import services.

## Route files

Each route file creates its own router and exports it as a named export:

```js
// src/routes/comments.js
const express = require('express');
const commentsService = require('../services/comments');

// Mounted at /tasks/:id/comments
const commentsRouter = express.Router({ mergeParams: true });

commentsRouter.get('/', (req, res, next) => {
  try {
    res.json(commentsService.listCommentsForTask(req.params.id));
  } catch (err) {
    next(err);
  }
});

commentsRouter.post('/', (req, res, next) => {
  try {
    res.status(201).json(commentsService.createComment(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
});

module.exports = { commentsRouter };
```

- Export the router as a **named** export (`module.exports = { commentsRouter }`), not as `module.exports = router`.
- Paths inside the router are **relative to the mount path**: `'/'` and `'/:id'`, not `'/comments/:id'`.
- A router mounted under a parameterised path (e.g. `/tasks/:id/...`) must use `express.Router({ mergeParams: true })`.
- A handler's only jobs are to read the request, call **one corresponding service function**, and send the response with the right status code (`201` for creates, `200` otherwise). Pass ids from `req.params` to the service as they arrive; the service parses them.
- Side effects such as email are the one exception to "one service call". The route calls the resource service, then the side-effect service (see `POST /users` calling `notificationsService.sendWelcomeEmail`).

## Services hold the logic

Every route handler calls a matching function in `src/services/<resource>.js`:

- **No SQL in services.** Services call functions in `src/db/queries/*`, never `db.prepare(...)`.
- **All validation lives here.** That covers required fields, allowed values (e.g. task status), and checks that referenced rows exist.
- Services know nothing about Express. They take plain arguments, return plain data, and never touch `req`, `res` or `next`.
- When a service hits a client error, it throws `httpError(status, message)` from `src/utils/http-error.js`. Map SQLite unique-constraint failures with `isUniqueViolation` from `src/db/errors.js`:

```js
// src/services/tags.js
const tagQueries = require('../db/queries/tags');
const { isUniqueViolation } = require('../db/errors');
const { httpError } = require('../utils/http-error');
const { isNonEmptyString } = require('../utils/validation');

function createTag({ name } = {}) {
  if (!name || !isNonEmptyString(name)) {
    throw httpError(400, 'name is required');
  }
  try {
    const id = tagQueries.insertTag(name.toLowerCase().trim());
    return tagQueries.findTagById(id);
  } catch (err) {
    if (isUniqueViolation(err)) throw httpError(409, 'tag already exists');
    throw err;
  }
}
```

- Side effects that aren't core to the resource, such as sending email, don't belong in the resource service. Put them in their own service (e.g. `src/services/notifications.js`).

## Queries hold the SQL

- `src/db/queries/<resource>.js` exports small named functions, usually one statement each: `findAllX`, `findXById`, `insertX` (returns the new id), `updateX`, `deleteX` (returns rows changed).
- Queries contain no business rules, defaults or HTTP concepts. They import only `../connection`.

## Errors go to `next`

Never build error responses inside a route handler with `res.status(4xx).json(...)`. Errors thrown by services already carry a status, so pass them straight through with `catch (err) { next(err); }`.

- The shared `errorHandler` in `src/middleware/error-handler.js` turns them into `{ "error": "<message>" }` with the given status. Errors without a status become `500`.
- Status codes: `400` for invalid input, `401` for a missing or invalid API key, `404` when the resource doesn't exist, `409` for unique-constraint conflicts, `500` for anything unexpected.

## Register the router

Register every router in `src/app.js` with `app.use`, the resource path, and the imported router. Do this before `app.use(errorHandler)`:

```js
const { commentsRouter } = require('./routes/comments');

app.use('/tasks/:id/comments', commentsRouter);
// ...other routers
app.use(errorHandler);
```

## Auth

Apply the `authenticate` middleware from `src/middleware/auth.js` per route, for destructive or sensitive operations. It checks the `x-api-key` header.

```js
const { authenticate } = require('../middleware/auth');

projectsRouter.delete('/:id', authenticate, (req, res, next) => { /* ... */ });
```

## Checklist

1. `src/db/queries/<resource>.js` holds the SQL.
2. `src/services/<resource>.js` holds the validation and business logic, calls the queries, and throws `httpError`.
3. `src/routes/<resource>.js` contains thin handlers that call the service and send errors to `next`, and it exports a named router.
4. The router is registered in `src/app.js` with `app.use('/<resource>', <resource>Router)`.
5. Tests are written in `tests/<resource>.test.js` following `.claude/contexts/testing-standards.md`.
6. If you changed the schema, update `src/db/schema.js` (it is shared by the seed script and the tests).
