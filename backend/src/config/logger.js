import { env } from './env.js';

function formatLog(level, message, meta) {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
}

export const logger = {
  info(message, meta) {
    if (env.NODE_ENV !== 'test') {
      console.info(formatLog('info', message, meta));
    }
  },
  warn(message, meta) {
    if (env.NODE_ENV !== 'test') {
      console.warn(formatLog('warn', message, meta));
    }
  },
  error(message, meta) {
    console.error(formatLog('error', message, meta));
  },
  debug(message, meta) {
    if (env.NODE_ENV === 'development') {
      console.debug(formatLog('debug', message, meta));
    }
  }
};
