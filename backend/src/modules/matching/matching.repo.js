import { query } from '../../db/connection.js';

/**
 * Matching Repository for querying institutions.
 * Owned by Dev B.
 */

export async function getActiveInstitutions() {
  const sql = `
    SELECT 
      id, 
      permanent_id AS "permanentId", 
      name, 
      normalized_name AS "normalizedName",
      region
    FROM institutions 
    WHERE active = 1
  `;
  const res = await query(sql);
  return res.rows;
}
