import * as documentsService from './documents.service.js';
import { sendSuccess } from '../../utils/response.js';

export async function uploadDocument(req, res, next) {
  try {
    const caseId = decodeURIComponent(req.params.id);
    const doc = await documentsService.saveDocument(caseId, req.file, req.user);
    return sendSuccess(res, doc, undefined, 201);
  } catch (err) {
    next(err);
  }
}

export async function downloadDocument(req, res, next) {
  try {
    const docId = Number(req.params.docId);
    const { stream, fileName, mimeType, sizeBytes } = await documentsService.getDocumentStream(docId, req.user);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', sizeBytes);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);

    stream.pipe(res);
  } catch (err) {
    next(err);
  }
}
