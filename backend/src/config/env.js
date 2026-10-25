import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().default(process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aicte_db'),
  DATABASE_URL_POOLED: z.string().optional(),
  UPLOAD_DIR: z.string().default('./uploads'),
  JWT_SECRET: z.string().min(8, 'JWT_SECRET must be at least 8 characters').default('change-me-to-a-long-random-string-at-least-32-chars'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  CORS_ORIGIN: z.string().default('http://localhost:5173')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
