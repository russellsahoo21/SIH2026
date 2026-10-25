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

// Route modules owned by Dev B
import institutionsRoutes from './modules/institutions/institutions.routes.js';
import suggestRoutes from './modules/matching/matching.routes.js';
import categoriesRoutes from './modules/matching/categories.routes.js';
import overlapsRoutes from './modules/overlaps/overlaps.routes.js';

// Route modules owned by Dev C
import slaRoutes from './modules/sla/sla.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import reportsRoutes from './modules/reports/reports.routes.js';
import importsRoutes from './modules/imports/imports.routes.js';

export function createApp() {
  const app = express();

  // Security middlewares
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? true : (env.CORS_ORIGIN && env.CORS_ORIGIN.includes(',') ? env.CORS_ORIGIN.split(',').map(s => s.trim()) : env.CORS_ORIGIN || true),
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

  // Base API routes (Dev A)
  app.use('/api/auth', authRoutes);
  app.use('/api/bureaus', bureausRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/cases', casesRoutes);

  // Base API routes (Dev B)
  app.use('/api/institutions', institutionsRoutes);
  app.use('/api/suggest', suggestRoutes);
  app.use('/api/categories', categoriesRoutes);
  app.use('/api/overlaps', overlapsRoutes);

  // Analytics, SLA, Reports & Imports API routes (Dev C)
  app.use('/api/sla-config', slaRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/reports', reportsRoutes);
  app.use('/api/imports', importsRoutes);

  // 404 & Global Error Handler
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
