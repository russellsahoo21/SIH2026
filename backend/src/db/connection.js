import pg from 'pg';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.DATABASE_URL || env.DATABASE_URL_POOLED,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle PostgreSQL client', { error: err.message });
});

export async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  logger.debug('Executed query', { text, duration, rows: res.rowCount });
  return res;
}

export async function getClient() {
  return await pool.connect();
}
