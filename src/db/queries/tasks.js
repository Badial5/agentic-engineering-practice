const { db } = require('../connection');

function findTaskById(id) {
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
}

module.exports = { findTaskById };
