const { Pool } = require('pg');

require('dotenv').config();

// Use DATABASE_URL if available (Docker/production), otherwise fall back to individual env vars
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Fallback for local development
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'university',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// Test the connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('PostgreSQL connection error:', err);
});

module.exports = pool;