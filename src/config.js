// Environment-driven configuration. Read once at startup.

const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.NODE_ENV === 'test' ? ':memory:' : (process.env.DB_PATH || 'taskr.db');
const API_KEY = process.env.API_KEY || 'dev-key';

module.exports = { PORT, DB_PATH, API_KEY };
