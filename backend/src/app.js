import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import { sendSuccess } from './utils/response.js';

// Route modules owned by Dev A
import authRoutes from './modules/auth/auth.routes.js';
import bureausRoutes from './modules/bureaus/bureaus.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import casesRoutes from './modules/cases/cases.routes.js';

export function createApp() {
  const app = express();

  // Security middlewares
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN || '*',
      credentials: true
    })
  );

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check route (public)
  app.get('/api/health', (req, res) => {
    return sendSuccess(res, {
      status: 'ok',
      time: new Date().toISOString()
    });
  });

  // Base API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/bureaus', bureausRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/cases', casesRoutes);

  // 404 & Global Error Handler
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
