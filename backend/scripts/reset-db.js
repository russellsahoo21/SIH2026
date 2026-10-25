import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool, query } from '../src/db/connection.js';
import { logger } from '../src/config/logger.js';
import { runMigrations } from '../src/db/migrate.js';
import { registerCase } from '../src/modules/cases/cases.service.js';
import { runEscalations } from '../src/modules/sla/escalation.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const seedDir = path.join(__dirname, '..', 'data', 'seed');

export async function resetDatabase() {
  logger.info('=== Starting Database Reset & Seeding ===');

  // 1. Truncate existing tables in cascade order
  logger.info('Clearing existing data from tables...');
  try {
    await query(`
      TRUNCATE TABLE 
        overlap_members,
        "overlaps",
        documents,
        actions,
        cases,
        case_counters,
        institutions,
        users,
        bureaus,
        sla_config
      CASCADE;
    `);
  } catch (err) {
    logger.warn('Truncate warning (tables might not exist yet):', err.message);
  }

  // 2. Ensure schema DDL is fully applied
  logger.info('Applying database schema...');
  await runMigrations();

  // 3. Seed Bureaus
  logger.info('Seeding bureaus...');
  const bureausData = JSON.parse(fs.readFileSync(path.join(seedDir, 'bureaus.json'), 'utf-8'));
  for (const b of bureausData) {
    await query(
      `INSERT INTO bureaus (code, name, active)
       VALUES ($1, $2, $3)
       ON CONFLICT (code) DO UPDATE SET name = $2, active = $3`,
      [b.code, b.name, b.active]
    );
  }

  // 4. Seed Demo Users
  logger.info('Seeding demo users...');
  const usersData = JSON.parse(fs.readFileSync(path.join(seedDir, 'users.json'), 'utf-8'));
  const userMap = new Map();
  for (const u of usersData) {
    const res = await query(
      `INSERT INTO users (username, full_name, password_hash, role, bureau_code, region, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (username) DO UPDATE 
       SET full_name = $2, password_hash = $3, role = $4, bureau_code = $5, region = $6, active = $7
       RETURNING id, username, role, bureau_code`,
      [u.username, u.fullName, u.passwordHash, u.role, u.bureauCode, u.region, u.active]
    );
    userMap.set(u.username, res.rows[0]);
  }

  // 5. Seed Institutions
  logger.info('Seeding 40 institutions...');
  const institutionsData = JSON.parse(fs.readFileSync(path.join(seedDir, 'institutions.json'), 'utf-8'));
  const instIdMap = new Map();
  for (const inst of institutionsData) {
    const res = await query(
      `INSERT INTO institutions (permanent_id, name, normalized_name, address, region, active)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (permanent_id) DO UPDATE
       SET name = $2, normalized_name = $3, address = $4, region = $5, active = $6
       RETURNING id, permanent_id`,
      [inst.permanentId, inst.name, inst.normalizedName, inst.address, inst.region, inst.active]
    );
    instIdMap.set(inst.permanentId, res.rows[0].id);
  }

  // 6. Seed SLA Config
  logger.info('Seeding SLA configurations...');
  const slaData = JSON.parse(fs.readFileSync(path.join(seedDir, 'sla-config.json'), 'utf-8'));
  const adminUser = userMap.get('admin');
  for (const s of slaData) {
    await query(
      `INSERT INTO sla_config (category, days, updated_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (category) DO UPDATE SET days = $2, updated_by = $3`,
      [s.category, s.days, adminUser?.id || null]
    );
  }

  // 7. Seed Cases via casesService.registerCase
  logger.info('Seeding cases and generating authentic history...');
  const casesData = JSON.parse(fs.readFileSync(path.join(seedDir, 'cases.json'), 'utf-8'));

  // Get officer users for bureaus
  const officerRb = userMap.get('officer.rb1') || adminUser;
  const officerPgrc = userMap.get('officer.pgrc1') || adminUser;
  const officerRo = userMap.get('officer.ro1') || adminUser;

  const bureauOfficers = {
    RB: officerRb,
    PGRC: officerPgrc,
    RO: officerRo,
    CELL: officerRb
  };

  let registeredCount = 0;
  for (const c of casesData) {
    const institutionId = instIdMap.get(c.institutionPermanentId);
    if (!institutionId) {
      logger.warn(`Institution not found for Permanent ID: ${c.institutionPermanentId}`);
      continue;
    }

    const actor = bureauOfficers[c.bureau] || adminUser;

    // Register case through actual service
    const regResult = await registerCase(
      {
        institutionId,
        category: c.category,
        sourceChannel: c.sourceChannel,
        receivedOn: c.receivedOn,
        description: c.description,
        bureau: c.bureau
      },
      actor
    );

    const caseId = regResult.case.id;
    registeredCount++;

    // If status is other than NEW, transition to intended status with audit action
    if (c.status && c.status !== 'NEW') {
      const isDisposed = c.status === 'DISPOSED';
      const disposedOn = isDisposed ? c.receivedOn : null;

      await query(
        `UPDATE cases
         SET status = $1,
             disposed_on = $2,
             assigned_officer_id = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [c.status, disposedOn, actor.id, caseId]
      );

      await query(
        `INSERT INTO actions (
           case_id, actor_id, actor_bureau, action_type,
           from_status, to_status, remark, visibility
         ) VALUES ($1, $2, $3, $4, 'NEW', $5, $6, 'SHARED')`,
        [
          caseId,
          actor.id,
          c.bureau,
          isDisposed ? 'DISPOSED' : 'STATUS_CHANGED',
          c.status,
          isDisposed ? 'Case resolved and disposed after committee verification.' : `Status progressed to ${c.status}`
        ]
      );
    }
  }

  logger.info(`Successfully registered and seeded ${registeredCount} cases.`);

  // 8. Run automatic escalation pass
  logger.info('Running escalation pass on overdue cases...');
  const escalated = await runEscalations();
  logger.info(`Escalation engine marked ${escalated} cases as ESCALATED.`);

  logger.info('=== Database Reset & Seeding Completed Successfully! ===');
}

resetDatabase()
  .then(() => pool.end())
  .catch((err) => {
    logger.error('Database reset failed:', { error: err.message, stack: err.stack });
    process.exit(1);
  });
