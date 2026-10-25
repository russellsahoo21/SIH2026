/**
 * Atomically generates a new Case ID for a given bureau and year inside a transaction.
 * Format: BUREAU/YEAR/NNNNN (e.g. PGRC/2026/00064)
 * @param {import('pg').PoolClient} client
 * @param {string} bureauCode
 * @param {number} year
 * @returns {Promise<string>}
 */
export async function generateCaseId(client, bureauCode, year = new Date().getUTCFullYear()) {
  const query = `
    INSERT INTO case_counters (bureau_code, year, last_seq)
    VALUES ($1, $2, 1)
    ON CONFLICT (bureau_code, year)
    DO UPDATE SET last_seq = case_counters.last_seq + 1
    RETURNING last_seq;
  `;
  const result = await client.query(query, [bureauCode, year]);
  const seq = result.rows[0].last_seq;
  const padded = String(seq).padStart(5, '0');
  return `${bureauCode}/${year}/${padded}`;
}
