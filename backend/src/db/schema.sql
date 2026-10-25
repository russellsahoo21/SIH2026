-- DDL Schema for AICTE Complaint Monitoring Dashboard (PostgreSQL / Neon)

CREATE TABLE IF NOT EXISTS bureaus (
  code        VARCHAR(20) PRIMARY KEY,               -- RB, PGRC, RO, CELL
  name        VARCHAR(255) NOT NULL,
  active      SMALLINT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(100) NOT NULL UNIQUE,
  full_name     VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(50) NOT NULL CHECK (role IN ('OFFICER','HEAD','COORDINATOR','MANAGEMENT','ADMIN')),
  bureau_code   VARCHAR(20) REFERENCES bureaus(code),
  region        VARCHAR(100),
  active        SMALLINT NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS institutions (
  id              SERIAL PRIMARY KEY,
  permanent_id    VARCHAR(100) NOT NULL UNIQUE,        -- AICTE Permanent ID (fictional in demo)
  name            VARCHAR(255) NOT NULL,
  normalized_name VARCHAR(255) NOT NULL,               -- output of text.normalizeName, used for matching
  address         TEXT,
  region          VARCHAR(100) NOT NULL,
  active          SMALLINT NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_institutions_norm ON institutions(normalized_name);

CREATE TABLE IF NOT EXISTS case_counters (
  bureau_code VARCHAR(20) NOT NULL,
  year        INTEGER NOT NULL,
  last_seq    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (bureau_code, year)
);

CREATE TABLE IF NOT EXISTS cases (
  id                   VARCHAR(50) PRIMARY KEY,       -- e.g. RB/2026/00001
  institution_id       INTEGER NOT NULL REFERENCES institutions(id),
  bureau_code          VARCHAR(20) NOT NULL REFERENCES bureaus(code),
  category             VARCHAR(100) NOT NULL,
  category_source      VARCHAR(50) NOT NULL DEFAULT 'MANUAL' CHECK (category_source IN ('MANUAL','SUGGESTED_CONFIRMED')),
  source_channel       VARCHAR(50) NOT NULL CHECK (source_channel IN ('EMAIL','LETTER','CPGRAMS','MINISTRY','VIP','COURT','RTI','PARLIAMENT','OTHER')),
  description          TEXT NOT NULL,
  status               VARCHAR(50) NOT NULL CHECK (status IN ('NEW','UNDER_PROCESS','PENDING','TRANSFERRED','ESCALATED','DISPOSED')),
  assigned_officer_id  INTEGER REFERENCES users(id),
  received_on          DATE NOT NULL,                  -- YYYY-MM-DD
  sla_days             INTEGER NOT NULL,               -- copied from sla_config at creation
  due_on               DATE NOT NULL,                  -- computed: received_on + sla_days
  disposed_on          DATE,
  last_action_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by           INTEGER NOT NULL REFERENCES users(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  version              INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_cases_institution ON cases(institution_id);
CREATE INDEX IF NOT EXISTS idx_cases_bureau_status ON cases(bureau_code, status);

CREATE TABLE IF NOT EXISTS actions (              -- append-only history
  id           SERIAL PRIMARY KEY,
  case_id      VARCHAR(50) NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  actor_id     INTEGER NOT NULL REFERENCES users(id),
  actor_bureau VARCHAR(20),
  action_type  VARCHAR(50) NOT NULL,
  from_status  VARCHAR(50),
  to_status    VARCHAR(50),
  remark       TEXT,
  visibility   VARCHAR(20) NOT NULL DEFAULT 'SHARED' CHECK (visibility IN ('SHARED','INTERNAL')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_actions_case ON actions(case_id);

CREATE TABLE IF NOT EXISTS documents (
  id          SERIAL PRIMARY KEY,
  case_id     VARCHAR(50) NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  file_name   VARCHAR(255) NOT NULL,
  stored_path VARCHAR(255) NOT NULL,
  mime_type   VARCHAR(100) NOT NULL,
  size_bytes  BIGINT NOT NULL,
  uploaded_by INTEGER NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "overlaps" (              -- one group per institution at a time
  id             SERIAL PRIMARY KEY,
  institution_id INTEGER NOT NULL REFERENCES institutions(id),
  status         VARCHAR(50) NOT NULL CHECK (status IN ('OPEN','COORDINATING','LINKED','DISMISSED','REVIEWED')),
  severity       VARCHAR(20) NOT NULL CHECK (severity IN ('HIGH','MEDIUM','LOW')),
  lead_bureau    VARCHAR(20) REFERENCES bureaus(code),
  notes          TEXT,
  reviewed_by    INTEGER REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS overlap_members (
  overlap_id     INTEGER NOT NULL REFERENCES "overlaps"(id) ON DELETE CASCADE,
  case_id        VARCHAR(50) NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  similarity     REAL NOT NULL,                  -- 0.0 to 1.0
  member_state   VARCHAR(50) NOT NULL CHECK (member_state IN ('DETECTED','LINKED','NOT_RELATED')),
  PRIMARY KEY (overlap_id, case_id)
);

CREATE TABLE IF NOT EXISTS sla_config (
  category    VARCHAR(100) PRIMARY KEY,
  days        INTEGER NOT NULL,
  updated_by  INTEGER REFERENCES users(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
