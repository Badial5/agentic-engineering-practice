// Builds the Express app. Does not listen — see server.js. Tests import this module directly.
const express = require('express');
const { requestLogger } = require('./middleware/request-logger');
const { errorHandler } = require('./middleware/error-handler');
const { healthRouter } = require('./routes/health');
const { webhooksRouter } = require('./routes/webhooks');
const { usersRouter } = require('./routes/users');
const { projectsRouter } = require('./routes/projects');
const { tasksRouter } = require('./routes/tasks');
const { commentsRouter } = require('./routes/comments');
const { tagsRouter, taskTagsRouter } = require('./routes/tags');

const app = express();

app.use(express.json());
app.use(requestLogger);

app.use('/', healthRouter);
app.use('/webhooks', webhooksRouter);
app.use('/users', usersRouter);
app.use('/projects', projectsRouter);
app.use('/tasks', tasksRouter);
app.use('/tasks/:id/comments', commentsRouter);
app.use('/tasks/:id/tags', taskTagsRouter);
app.use('/tags', tagsRouter);

app.use(errorHandler);

module.exports = app;
