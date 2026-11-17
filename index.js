const express = require('express');
const { PORT } = require('./misc/constants');
const router = require('./routes');
const { requestLogger } = require('./src/middleware/request-logger');
const { errorHandler } = require('./src/middleware/error-handler');
const { healthRouter } = require('./src/routes/health');
const { webhooksRouter } = require('./src/routes/webhooks');
const { tagsRouter, taskTagsRouter } = require('./src/routes/tags');
const { commentsRouter } = require('./src/routes/comments');

const app = express();

app.use(express.json());
app.use(requestLogger);

app.use('/', healthRouter);
app.use('/webhooks', webhooksRouter);
app.use('/tasks/:id/comments', commentsRouter);
app.use('/tasks/:id/tags', taskTagsRouter);
app.use('/tags', tagsRouter);
app.use(router);
app.use(errorHandler);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Taskr API running on port ${PORT}`);
  });
}

module.exports = app;
