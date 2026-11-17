# API Conventions: Adding a New Endpoint

Follow these rules whenever you add or change an API route or endpoint in the Taskr API.

## Where things go

| Piece | Location | Example for a `comments` resource |
|---|---|---|
| Routes | `src/routes/<resource>.js` | `src/routes/comments.js` |
| Business logic and DB queries | `src/services/<resource>.js` | `src/services/comments.js` |
| Router registration | `src/index.js` | `app.use('/comments', commentsRouter)` |

- The filename is the **resource name, lowercase and plural**: `tasks.js`, `projects.js`, `tags.js`. Not `taskRoutes.js`, `Task.js` or `get-tasks.js`.
- New routes **never** go in the root `routes.js`. It is the legacy file that the refactor will split up.

### Before the refactor lands

`src/` is the target layout. If `src/routes/` or `src/services/` doesn't exist yet, create it for the new resource. Don't put new files at the repo root. Until the entry point moves to `src/index.js`, register the router in the root `index.js` with the same `app.use` call. Don't move or rewrite existing routes as part of an endpoint task unless you are asked to.

## Route files

Each route file creates its own router and exports it as a named export:

```js
// src/routes/comments.js
const express = require('express');
const commentsService = require('../services/comments');

const commentsRouter = express.Router();

commentsRouter.get('/:id', async (req, res, next) => {
  try {
    const comment = await commentsService.getComment(req.params.id);
    if (!comment) {
      return next({ status: 404, message: 'Comment not found' });
    }
    res.json(comment);
  } catch (err) {
    next(err);
  }
});

commentsRouter.post('/', async (req, res, next) => {
  try {
    const comment = await commentsService.createComment(req.body);
    res.status(201).json(comment);
  } catch (err) {
    next(err);
  }
});

module.exports = { commentsRouter };
```

- Export the router as a **named** export (`module.exports = { commentsRouter }`), not as `module.exports = router`.
- Paths inside the router are **relative to the mount path**: `'/'` and `'/:id'`, not `'/comments/:id'`.
- A handler's only jobs are to read the request, call **one corresponding service function**, and send the response with the right status code (`201` for creates, `200` otherwise).

## Services hold the logic

Every route handler calls a matching function in `src/services/<resource>.js`. The handler itself contains no business logic:

- **No SQL in handlers.** All `db.prepare(...)` calls live in the service.
- **No validation in handlers.** Required fields, allowed values (e.g. task status), and checks that referenced rows exist all go in the service.
- Services know nothing about Express. They take plain arguments and return plain data, and they never touch `req`, `res` or `next`.
- When a service hits a client error, it throws an `Error` with a `status` property:

```js
// src/services/comments.js
const { db } = require('../../DB');

function createComment({ task_id, user_id, body }) {
  if (typeof body !== 'string' || !body.trim()) {
    throw Object.assign(new Error('body is required'), { status: 400 });
  }
  // ...insert and return the new row
}

module.exports = { createComment /*, ... */ };
```

- Side effects that aren't core to the resource, such as sending email, don't belong in the service function either. Keep them separate.

## Errors go to `next`

Never build error responses inside a route handler with `res.status(4xx).json(...)`. Pass the error to Express's `next` function as an object with a status code and a message:

```js
return next({ status: 404, message: 'Task not found' });
```

- Errors thrown by services already have that shape, so pass them straight through with `catch (err) { next(err); }`.
- The shared `errorHandler` in `middleware.js` turns them into `{ "error": "<message>" }` with the given status. Errors without a status become `500`.
- Status codes: `400` for invalid input, `401` for a missing or invalid API key, `404` when the resource doesn't exist, `409` for unique-constraint conflicts, `500` for anything unexpected.

## Register the router

Register every router in `src/index.js` with `app.use`, the resource path, and the imported router. Do this before `app.use(errorHandler)`:

```js
const { commentsRouter } = require('./routes/comments');

app.use('/comments', commentsRouter);
// ...other routers
app.use(errorHandler);
```

## Auth

Apply the `authenticate` middleware from `auth.js` per route, for destructive or sensitive operations. It checks the `x-api-key` header.

```js
commentsRouter.delete('/:id', authenticate, async (req, res, next) => { /* ... */ });
```

## Checklist

1. `src/services/<resource>.js` holds the queries, validation and business logic, and throws errors that have a `status`.
2. `src/routes/<resource>.js` contains thin handlers that call the service and send errors to `next`, and it exports a named router.
3. The router is registered in `src/index.js` (or the root `index.js` until the refactor) with `app.use('/<resource>', <resource>Router)`.
4. Tests are written in `tests/<resource>.test.js` following `.claude/contexts/testing-standards.md`.
5. If you changed the schema, update both `db/seed.js` and `tests/schema.js`.
