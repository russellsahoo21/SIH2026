import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { pool } from './db/connection.js';
import { runMigrations } from './db/migrate.js';

async function startServer() {
  try {
    logger.info('Connecting to Neon PostgreSQL...');
    await pool.query('SELECT 1');
    logger.info('Connected to Neon PostgreSQL successfully.');

    // Auto-run migrations on startup if needed
    await runMigrations();

    const app = createApp();

    const server = app.listen(env.PORT, () => {
      logger.info(`Server listening on port ${env.PORT} in ${env.NODE_ENV} mode`);
      logger.info(`Health check available at http://localhost:${env.PORT}/api/health`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await pool.end();
        logger.info('PostgreSQL pool closed. Server terminated.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    logger.error('Failed to start server:', { error: err.message, stack: err.stack });
    process.exit(1);
  }
}

startServer();
