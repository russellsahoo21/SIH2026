export function sendSuccess(res, data, meta = undefined, status = 200) {
  const body = { data };
  if (meta !== undefined) {
    body.meta = meta;
  }
  return res.status(status).json(body);
}

export function sendError(res, status, code, message, details = undefined) {
  const body = {
    error: {
      code,
      message
    }
  };
  if (details !== undefined) {
    body.error.details = details;
  }
  return res.status(status).json(body);
}
