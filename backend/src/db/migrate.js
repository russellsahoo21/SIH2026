import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, pool } from './connection.js';
import { logger } from '../config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf-8');

  logger.info('Running database migrations...');
  await query(sql);
  logger.info('Database migrations applied successfully.');
}

// Allow direct CLI execution
if (process.argv[1] === __filename) {
  runMigrations()
    .then(() => pool.end())
    .catch((err) => {
      logger.error('Migration failed', { error: err.message, stack: err.stack });
      process.exit(1);
    });
}
