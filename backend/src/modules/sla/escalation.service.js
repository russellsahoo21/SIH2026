import { query } from '../../db/connection.js';
import { withTransaction } from '../../db/transaction.js';
import { logger } from '../../config/logger.js';

let cachedSystemUserId = null;

async function getSystemUserId(executor) {
  if (cachedSystemUserId) return cachedSystemUserId;
  const res = await executor.query("SELECT id FROM users WHERE username = 'system'");
  if (res.rows.length > 0) {
    cachedSystemUserId = res.rows[0].id;
    return cachedSystemUserId;
  }
  const adminRes = await executor.query("SELECT id FROM users WHERE role = 'ADMIN' ORDER BY id ASC LIMIT 1");
  if (adminRes.rows.length > 0) {
    return adminRes.rows[0].id;
  }
  return 1;
}

/**
 * Idempotently scans for open overdue cases and marks them as ESCALATED.
 * Executed on-demand upon GET /api/cases and GET /api/dashboard/* requests.
 * @returns {Promise<number>} Number of newly escalated cases
 */
export async function runEscalations() {
  try {
    // Find open cases past due_on that are not already ESCALATED or DISPOSED
    const overdueRes = await query(
      `SELECT id, bureau_code, status, due_on, sla_days, version
       FROM cases
       WHERE status NOT IN ('DISPOSED', 'ESCALATED')
         AND due_on < CURRENT_DATE`
    );

    if (overdueRes.rows.length === 0) {
      return 0;
    }

    let escalatedCount = 0;

    for (const caseRow of overdueRes.rows) {
      await withTransaction(async (client) => {
        const sysId = await getSystemUserId(client);

        // Conditional update ensures idempotency and avoids version conflicts
        const updateRes = await client.query(
          `UPDATE cases
           SET status = 'ESCALATED',
               last_action_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP,
               version = version + 1
           WHERE id = $1 AND status NOT IN ('DISPOSED', 'ESCALATED')
           RETURNING id, status`,
          [caseRow.id]
        );

        if (updateRes.rowCount > 0) {
          await client.query(
            `INSERT INTO actions (
               case_id, actor_id, actor_bureau, action_type,
               from_status, to_status, remark, visibility
             ) VALUES ($1, $2, $3, 'ESCALATED', $4, 'ESCALATED', $5, 'SHARED')`,
            [
              caseRow.id,
              sysId,
              caseRow.bureau_code,
              caseRow.status,
              'System Escalation: Grievance resolution exceeded prescribed SLA duration.'
            ]
          );
          escalatedCount++;
        }
      });
    }

    if (escalatedCount > 0) {
      logger.info(`[Escalation Engine] Automatically escalated ${escalatedCount} overdue cases`);
    }

    return escalatedCount;
  } catch (err) {
    logger.error('Error during automated escalation run', { error: err.message });
    return 0;
  }
}
