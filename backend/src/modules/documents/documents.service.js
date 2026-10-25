import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/ApiError.js';
import { withTransaction } from '../../db/transaction.js';
import * as documentsRepo from './documents.repo.js';
import * as actionsRepo from '../actions/actions.repo.js';
import { canEdit, viewLevel } from '../../utils/access.js';
import { query } from '../../db/connection.js';

/**
 * Checks magic bytes of a buffer to verify true file format.
 */
export function detectMimeType(buffer, originalName = '') {
  if (buffer.length >= 4) {
    // PDF: %PDF (25 50 44 46)
    if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
      return 'application/pdf';
    }
    // PNG: 89 50 4E 47
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      return 'image/png';
    }
  }

  if (buffer.length >= 3) {
    // JPEG: FF D8 FF
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      return 'image/jpeg';
    }
  }

  if (buffer.length >= 4) {
    // ZIP / DOCX: PK.. (50 4B 03 04)
    if (buffer[0] === 0x50 && buffer[1] === 0x4B && (buffer[2] === 0x03 || buffer[2] === 0x05)) {
      if (originalName.toLowerCase().endsWith('.docx')) {
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      }
    }
  }

  return null;
}

export async function saveDocument(caseId, file, actor) {
  if (!file) {
    throw new ApiError(400, 'VALIDATION_FAILED', 'File is required');
  }

  // 10 MB limit
  if (file.size > 10 * 1024 * 1024) {
    throw new ApiError(413, 'FILE_TOO_LARGE', 'Uploaded file exceeds 10 MB limit');
  }

  // Find case
  const caseRes = await query('SELECT * FROM cases WHERE id = $1', [caseId]);
  const caseRow = caseRes.rows[0];

  if (!caseRow) {
    throw new ApiError(404, 'NOT_FOUND', 'Case not found');
  }

  // Check edit permissions
  if (!canEdit(caseRow, actor)) {
    throw new ApiError(403, 'FORBIDDEN', 'You do not have permission to upload documents to this case');
  }

  // Verify magic bytes
  const verifiedMime = detectMimeType(file.buffer, file.originalname);
  if (!verifiedMime) {
    throw new ApiError(415, 'UNSUPPORTED_FILE_TYPE', 'File type not supported. Allowed: PDF, JPEG, PNG, DOCX');
  }

  // Ensure upload directory exists
  if (!fs.existsSync(env.UPLOAD_DIR)) {
    fs.mkdirSync(env.UPLOAD_DIR, { recursive: true });
  }

  // Generate UUID filename
  const extension = path.extname(file.originalname) || '';
  const storedFilename = `${crypto.randomUUID()}${extension}`;
  const storedPath = path.join(env.UPLOAD_DIR, storedFilename);

  // Write file to disk
  fs.writeFileSync(storedPath, file.buffer);

  // Write DB rows atomically
  return await withTransaction(async (client) => {
    const doc = await documentsRepo.insertDocument(client, {
      caseId,
      fileName: file.originalname,
      storedPath,
      mimeType: verifiedMime,
      sizeBytes: file.size,
      uploadedBy: actor.id
    });

    await actionsRepo.insertAction(client, {
      caseId,
      actorId: actor.id,
      actorBureau: actor.bureau,
      actionType: 'DOCUMENT_ADDED',
      remark: `Uploaded document: ${file.originalname}`,
      visibility: 'SHARED'
    });

    return doc;
  });
}

export async function getDocumentStream(docId, viewer) {
  const doc = await documentsRepo.findDocumentById(docId);
  if (!doc) {
    throw new ApiError(404, 'NOT_FOUND', 'Document not found');
  }

  // Verify file exists on disk
  if (!fs.existsSync(doc.storedPath)) {
    throw new ApiError(404, 'NOT_FOUND', 'File not found on storage');
  }

  return {
    stream: fs.createReadStream(doc.storedPath),
    fileName: doc.fileName,
    mimeType: doc.mimeType,
    sizeBytes: doc.sizeBytes
  };
}
