import { query } from '../../db/connection.js';

export async function insertDocument(db, {
  caseId,
  fileName,
  storedPath,
  mimeType,
  sizeBytes,
  uploadedBy
}) {
  const runner = db.query ? db : { query };
  const sql = `
    INSERT INTO documents (
      case_id, file_name, stored_path, mime_type, size_bytes, uploaded_by, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
    RETURNING id, case_id AS "caseId", file_name AS "fileName", mime_type AS "mimeType",
              size_bytes AS "sizeBytes", uploaded_by AS "uploadedBy", created_at AS "createdAt"
  `;
  const result = await runner.query(sql, [
    caseId,
    fileName,
    storedPath,
    mimeType,
    sizeBytes,
    uploadedBy
  ]);
  return result.rows[0];
}

export async function findDocumentById(id) {
  const result = await query(
    `SELECT d.id, d.case_id AS "caseId", d.file_name AS "fileName", d.stored_path AS "storedPath",
            d.mime_type AS "mimeType", d.size_bytes AS "sizeBytes", d.uploaded_by AS "uploadedBy",
            d.created_at AS "createdAt", c.bureau_code AS "bureauCode"
     FROM documents d
     JOIN cases c ON d.case_id = c.id
     WHERE d.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

export async function findDocumentsByCaseId(caseId) {
  const result = await query(
    `SELECT id, case_id AS "caseId", file_name AS "fileName", mime_type AS "mimeType",
            size_bytes AS "sizeBytes", uploaded_by AS "uploadedBy", created_at AS "createdAt"
     FROM documents
     WHERE case_id = $1
     ORDER BY created_at DESC`,
    [caseId]
  );
  return result.rows;
}
