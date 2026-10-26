import bcrypt from 'bcryptjs';
import { pool, query } from '../src/db/connection.js';
import { logger } from '../src/config/logger.js';
import { runMigrations } from '../src/db/migrate.js';

export async function seedInitial() {
  await runMigrations();

  logger.info('Seeding initial bureaus...');
  const bureaus = [
    { code: 'RB', name: 'Regulation Bureau' },
    { code: 'PGRC', name: 'Public Grievance Redressal Cell' },
    { code: 'RO', name: 'Regional Office' },
    { code: 'CELL', name: 'Other Cells' }
  ];

  for (const b of bureaus) {
    await query(
      `INSERT INTO bureaus (code, name, active)
       VALUES ($1, $2, 1)
       ON CONFLICT (code) DO UPDATE SET name = $2, active = 1`,
      [b.code, b.name]
    );
  }

  logger.info('Seeding demo users...');
  const passwordHash = await bcrypt.hash('Demo@123', 10);
  // System account gets random password so it cannot log in
  const systemPasswordHash = await bcrypt.hash(Math.random().toString(36), 10);

  const users = [
    { username: 'officer.rb1', fullName: 'Shri Rajesh Kumar', role: 'OFFICER', bureau: 'RB', region: 'North', pass: passwordHash },
    { username: 'officer.pgrc1', fullName: 'Smt. Priya Sharma', role: 'OFFICER', bureau: 'PGRC', region: 'West', pass: passwordHash },
    { username: 'head.rb', fullName: 'Dr. A. K. Verma', role: 'HEAD', bureau: 'RB', region: 'Central', pass: passwordHash },
    { username: 'head.pgrc', fullName: 'Dr. Meena Iyer', role: 'HEAD', bureau: 'PGRC', region: 'South', pass: passwordHash },
    { username: 'coordinator', fullName: 'Coordination Desk', role: 'COORDINATOR', bureau: null, region: null, pass: passwordHash },
    { username: 'management', fullName: 'Senior Management Desk', role: 'MANAGEMENT', bureau: null, region: null, pass: passwordHash },
    { username: 'admin', fullName: 'System Administrator', role: 'ADMIN', bureau: null, region: null, pass: passwordHash },
    { username: 'student', fullName: 'Demo Student', role: 'STUDENT', bureau: null, region: null, pass: passwordHash },
    { username: 'system', fullName: 'System Automated Account', role: 'ADMIN', bureau: null, region: null, pass: systemPasswordHash }
  ];

  for (const u of users) {
    await query(
      `INSERT INTO users (username, full_name, password_hash, role, bureau_code, region, active)
       VALUES ($1, $2, $3, $4, $5, $6, 1)
       ON CONFLICT (username) DO UPDATE 
       SET full_name = $2, password_hash = $3, role = $4, bureau_code = $5, region = $6, active = 1`,
      [u.username, u.fullName, u.pass, u.role, u.bureau, u.region]
    );
  }

  // Also seed default SLA config
  logger.info('Seeding default SLA configs...');
  const slaConfigs = [
    { category: 'FEES', days: 21 },
    { category: 'INTAKE', days: 21 },
    { category: 'FACULTY', days: 30 },
    { category: 'INFRASTRUCTURE', days: 30 },
    { category: 'RAGGING', days: 7 },
    { category: 'NORM_VIOLATION', days: 21 },
    { category: 'OTHER', days: 21 }
  ];

  for (const sla of slaConfigs) {
    await query(
      `INSERT INTO sla_config (category, days)
       VALUES ($1, $2)
       ON CONFLICT (category) DO UPDATE SET days = $2`,
      [sla.category, sla.days]
    );
  }

  // Seed sample institution so cases can be registered
  logger.info('Seeding sample institution...');
  await query(
    `INSERT INTO institutions (permanent_id, name, normalized_name, address, region, active)
     VALUES ('AICTE-PID-0012', 'Hillcrest Institute of Technology', 'hillcrest institute of technology', 'Plot 4, Tech Park', 'North', 1)
     ON CONFLICT (permanent_id) DO NOTHING`
  );

  logger.info('Initial seed completed successfully!');
}

seedInitial()
  .then(() => pool.end())
  .catch((err) => {
    logger.error('Seed error:', { error: err.message, stack: err.stack });
    process.exit(1);
  });
