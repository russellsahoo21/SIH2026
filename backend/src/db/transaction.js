import { getClient } from './connection.js';

/**
 * Execute a callback within an isolated PostgreSQL transaction.
 * Automatically BEGINs, COMMITs on success, or ROLLBACKs on error.
 * @template T
 * @param {(client: import('pg').PoolClient) => Promise<T>} callback
 * @returns {Promise<T>}
 */
export async function withTransaction(callback) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      // ignore rollback error
    }
    throw err;
  } finally {
    client.release();
  }
}
