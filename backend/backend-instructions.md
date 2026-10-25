# Backend Instructions: Integrated Complaint Monitoring Dashboard

Project: SIH26264 (AICTE). Prototype backend for a single-window dashboard where AICTE bureaus and cells register, track and coordinate complaints about institutions, and where overlapping cases about the same institution are detected automatically.

Team: 3 backend developers working in parallel (Dev A, Dev B, Dev C). Read the whole document once before writing code. Sections 1 to 6 are shared rules; sections 7 onward describe the work split.

---

## 1. Principles

1. **Assist, never decide.** The system suggests categories, matches institution names and flags overlaps. A person confirms. No endpoint closes a case automatically.
2. **Need to know.** An officer sees that a related case exists in another bureau, with basic metadata. Internal remarks stay with the owning bureau.
3. **Append-only history.** Every change to a case writes a row to the `actions` table. There are no update or delete routes for history.
4. **Thin routes, fat services.** Routes only parse input and call a service. Business rules live in services so they can be tested without HTTP.
5. **One contract.** The frontend builds against the response shapes in section 5. If a shape must change, announce it in the team chat before merging.

---

## 2. Technology stack

| Concern | Choice | Why |
|---|---|---|
| Runtime | Node.js 20 LTS | Stable, long-term support |
| Language | JavaScript (ES modules, `"type": "module"`) | Team requirement |
| Web framework | Express 4 | Simple, widely known |
| Database | SQLite via `better-sqlite3` | Single file, no install, synchronous API keeps code simple |
| Validation | `zod` | Clear schemas, readable error messages |
| Auth | `jsonwebtoken` + `bcryptjs` | Stateless tokens, password hashing |
| Name matching | `fastest-levenshtein` | Fast edit distance for college names |
| Uploads | `multer` | Standard multipart handling |
| Excel | `xlsx` (SheetJS) | Read and write `.xlsx` for imports and reports |
| Security headers | `helmet`, `cors`, `express-rate-limit` | Baseline hardening |
| Tests | `jest` + `supertest` | Standard for Express |
| Config | `dotenv` | Environment variables from `.env` |

### 2.1 Install and run

```bash
npm install
cp .env.example .env
npm run db:reset     # creates tables and loads sample data
npm run dev          # http://localhost:4000
npm test
```

### 2.2 `.env.example`

```
PORT=4000
NODE_ENV=development
DB_PATH=./data/app.db
UPLOAD_DIR=./uploads
JWT_SECRET=change-me-to-a-long-random-string
JWT_EXPIRES_IN=8h
CORS_ORIGIN=http://localhost:5173
```

---

## 3. Folder structure

```
backend/
├── package.json
├── .env.example
├── jest.config.js
├── data/
│   ├── app.db                    (created at runtime, git-ignored)
│   └── seed/
│       ├── bureaus.json
│       ├── institutions.json     (40 fictional colleges)
│       ├── cases.json            (about 200 fictional cases)
│       ├── users.json            (one user per role)
│       └── sla-config.json
├── uploads/                      (git-ignored, never served as static files)
├── scripts/
│   ├── reset-db.js               (drop, migrate, seed)
│   └── generate-seed.js          (optional: builds cases.json with planted overlaps)
├── src/
│   ├── server.js                 (starts listening)
│   ├── app.js                    (builds the Express app, no listen, testable)
│   ├── config/
│   │   ├── env.js                (reads and validates env vars)
│   │   └── constants.js          (roles, statuses, bureau codes, transitions)
│   ├── db/
│   │   ├── connection.js         (opens the SQLite handle)
│   │   ├── schema.sql            (all CREATE TABLE statements)
│   │   ├── migrate.js            (applies schema.sql)
│   │   └── transaction.js        (small helper around db.transaction)
│   ├── middleware/
│   │   ├── authenticate.js       (verifies JWT, sets req.user)
│   │   ├── authorize.js          (role and bureau checks)
│   │   ├── validate.js           (zod middleware factory)
│   │   ├── errorHandler.js       (single place that formats errors)
│   │   └── notFound.js
│   ├── utils/
│   │   ├── ApiError.js           (error class with status and code)
│   │   ├── response.js           (success envelope helpers)
│   │   ├── text.js               (normalizeName, tokenize, abbreviations)
│   │   ├── similarity.js         (levenshtein ratio, token Jaccard)
│   │   ├── sla.js                (deadline and state calculation, pure)
│   │   ├── caseId.js             (BUREAU/YEAR/NUMBER generator)
│   │   └── dates.js              (ISO helpers, today, days between)
│   └── modules/
│       ├── auth/                 (login, me)                       Dev A
│       ├── users/                (admin user management)           Dev A
│       ├── bureaus/              (reference lists)                 Dev A
│       ├── cases/                (register, read, update, status)  Dev A
│       ├── actions/              (history and remarks)             Dev A
│       ├── documents/            (upload and download)             Dev A
│       ├── institutions/         (search, profile)                 Dev B
│       ├── matching/             (suggest institution, category)   Dev B
│       ├── overlaps/             (detect, list, link, dismiss)     Dev B
│       ├── dashboard/            (summary, workload, ageing)       Dev C
│       ├── reports/              (json and xlsx exports)           Dev C
│       ├── imports/              (bulk case import from xlsx)      Dev C
│       └── sla/                  (sla config and due-state read)   Dev C
└── tests/
    ├── helpers/                  (test app, login helper, db reset)
    ├── unit/                     (pure functions)
    └── integration/              (one file per module)
```

Each module folder follows the same pattern:

```
modules/cases/
├── cases.routes.js       (URL to controller mapping, middleware chain)
├── cases.controller.js   (reads req, calls service, sends response)
├── cases.service.js      (business rules, transactions)
├── cases.repo.js         (SQL only, prepared statements)
└── cases.schema.js       (zod schemas for body and query)
```

Rule: only `*.repo.js` files contain SQL. Controllers never touch the database.

---

## 4. Shared rules

### 4.1 Roles and permissions

| Role | Code | Scope | Summary |
|---|---|---|---|
| Bureau officer | `OFFICER` | Own bureau | Registers and updates own-bureau cases, adds remarks, requests transfer, can read all cases but sees only shared remarks of other bureaus |
| Bureau head | `HEAD` | Own bureau | Everything an officer does, plus assign officers, escalate, dispose and reopen |
| Coordinator | `COORDINATOR` | All bureaus | Reviews overlaps, links cases, sets lead bureau, marks not related. Cannot change case status |
| Senior management | `MANAGEMENT` | All | Read-only: dashboards, reports, all cases and shared history |
| Admin | `ADMIN` | All | Users, institutions master list, SLA settings. Cannot change case content |

Bureau codes: `RB` (Regulation Bureau), `PGRC` (Public Grievance Redressal Cell), `RO` (Regional Office), `CELL` (any other cell, configurable).

### 4.2 Case status and allowed transitions

Statuses: `NEW`, `UNDER_PROCESS`, `PENDING`, `TRANSFERRED`, `ESCALATED`, `DISPOSED`.

```js
// src/config/constants.js
export const TRANSITIONS = {
  NEW:           ['UNDER_PROCESS', 'TRANSFERRED'],
  UNDER_PROCESS: ['PENDING', 'ESCALATED', 'DISPOSED', 'TRANSFERRED'],
  PENDING:       ['UNDER_PROCESS', 'ESCALATED', 'DISPOSED'],
  ESCALATED:     ['UNDER_PROCESS', 'DISPOSED'],
  TRANSFERRED:   ['UNDER_PROCESS'],           // receiving bureau picks it up
  DISPOSED:      ['UNDER_PROCESS'],           // reopen, HEAD only
};

// Transitions that need the HEAD role
export const HEAD_ONLY_TRANSITIONS = ['DISPOSED', 'REOPEN'];
```

Any transition not listed returns `409 INVALID_TRANSITION`.

### 4.3 Response envelope

Success:

```json
{ "data": { ... }, "meta": { "page": 1, "pageSize": 25, "total": 200 } }
```

`meta` appears only on list endpoints.

Error:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Category is required",
    "details": [{ "path": "category", "message": "Required" }]
  }
}
```

Standard error codes:

| HTTP | Code | When |
|---|---|---|
| 400 | `VALIDATION_FAILED` | Body, query or params fail zod validation |
| 401 | `UNAUTHENTICATED` | Missing or invalid token |
| 403 | `FORBIDDEN` | Role or bureau not allowed |
| 404 | `NOT_FOUND` | Record does not exist, or is hidden from this user |
| 409 | `INVALID_TRANSITION` | Status change not allowed from current status |
| 409 | `VERSION_CONFLICT` | Someone else changed the record (see 4.5) |
| 413 | `FILE_TOO_LARGE` | Upload over 10 MB |
| 415 | `UNSUPPORTED_FILE_TYPE` | Upload type not allowed |
| 429 | `RATE_LIMITED` | Too many login attempts |
| 500 | `INTERNAL_ERROR` | Anything unexpected (details hidden outside development) |

`ApiError` usage:

```js
// src/utils/ApiError.js
export class ApiError extends Error {
  constructor(status, code, message, details = undefined) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
```

### 4.4 Authentication

- `POST /api/auth/login` returns a JWT valid for `JWT_EXPIRES_IN`.
- Clients send `Authorization: Bearer <token>`.
- The token payload contains only `{ sub, role, bureau, region }`. Permissions are re-checked against the database on sensitive writes, so a deactivated user is blocked immediately.
- Passwords use `bcryptjs` with cost 10. Never log passwords or tokens.

```js
// src/middleware/authenticate.js (shape)
export function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new ApiError(401, 'UNAUTHENTICATED', 'Login required'));
  try {
    req.user = jwt.verify(token, env.JWT_SECRET);
    next();
  } catch {
    next(new ApiError(401, 'UNAUTHENTICATED', 'Session expired, please log in again'));
  }
}
```

```js
// src/middleware/authorize.js (shape)
// roles: array of allowed role codes. bureauOf(req) returns the bureau of the record being touched.
export const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : next(new ApiError(403, 'FORBIDDEN', 'Your role cannot do this'));

export const requireSameBureauOrHead = (getBureau) => (req, res, next) => {
  const sameBureau = req.user.bureau === getBureau(req);
  const isHead = req.user.role === 'HEAD' || req.user.role === 'ADMIN';
  return sameBureau || isHead ? next() : next(new ApiError(403, 'FORBIDDEN', 'This case belongs to another bureau'));
};
```

### 4.5 Concurrency (optimistic locking)

Every case has an integer `version` column. Updates that change a case must send the `version` they last read. The service runs:

```sql
UPDATE cases SET ..., version = version + 1 WHERE id = ? AND version = ?
```

If zero rows change, respond `409 VERSION_CONFLICT` with the current version. Status changes, transfers, assignments and links all use this check.

### 4.6 Visibility of remarks

`actions.visibility` is either `SHARED` or `INTERNAL`.

- `SHARED`: visible to every role that can read the case.
- `INTERNAL`: visible only to users of the owning bureau, `HEAD` of that bureau, `ADMIN`, and `MANAGEMENT`.

The action repository applies this filter. Never filter in the controller.

### 4.7 Validation

Every route with input has a zod schema in `*.schema.js`. The `validate` middleware parses `body`, `query` or `params` and replaces them with the parsed values.

```js
// src/middleware/validate.js (shape)
export const validate = ({ body, query, params }) => (req, res, next) => {
  try {
    if (body) req.body = body.parse(req.body);
    if (query) req.query = query.parse(req.query);
    if (params) req.params = params.parse(req.params);
    next();
  } catch (err) {
    next(new ApiError(400, 'VALIDATION_FAILED', 'Some fields are invalid', err.issues.map(i => ({ path: i.path.join('.'), message: i.message }))));
  }
};
```

### 4.8 Coding standards

- ES modules, `async/await`, no callbacks.
- Prepared statements only (`db.prepare(...).run/get/all` with `?` placeholders). Never build SQL with string concatenation from user input.
- Write multi-step changes inside `db.transaction`. A case update and its action row must succeed or fail together.
- No `console.log` in committed code. Use the logger in `src/config/logger.js`.
- Functions are short (under about 40 lines). Name functions by what they return or do.
- Dates are stored as ISO strings (`YYYY-MM-DD` for dates, full ISO for timestamps).
- Every new route appears in section 6 (route table) of this document before merging.

### 4.9 Git workflow

- Branches: `feature/backend-core` (Dev A), `feature/backend-matching` (Dev B), `feature/backend-analytics` (Dev C).
- Merge to `dev` through a pull request. Each PR needs one review from another backend developer.
- Only the team lead merges `dev` into `main`.
- Shared files (`schema.sql`, `constants.js`, `app.js`, `package.json`) change only with a message in the team chat first. Keep these edits small and merge them quickly.

---

## 5. Data model

### 5.1 Tables (`src/db/schema.sql` owner: Dev A)

```sql
CREATE TABLE IF NOT EXISTS bureaus (
  code        TEXT PRIMARY KEY,               -- RB, PGRC, RO, CELL
  name        TEXT NOT NULL,
  active      INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE,
  full_name     TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('OFFICER','HEAD','COORDINATOR','MANAGEMENT','ADMIN')),
  bureau_code   TEXT REFERENCES bureaus(code),
  region        TEXT,
  active        INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS institutions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  permanent_id    TEXT NOT NULL UNIQUE,        -- AICTE Permanent ID (fictional in demo)
  name            TEXT NOT NULL,
  normalized_name TEXT NOT NULL,               -- output of text.normalizeName, used for matching
  address         TEXT,
  region          TEXT NOT NULL,
  active          INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_institutions_norm ON institutions(normalized_name);

CREATE TABLE IF NOT EXISTS case_counters (
  bureau_code TEXT NOT NULL,
  year        INTEGER NOT NULL,
  last_seq    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (bureau_code, year)
);

CREATE TABLE IF NOT EXISTS cases (
  id                   TEXT PRIMARY KEY,       -- e.g. RB/2026/00001
  institution_id       INTEGER NOT NULL REFERENCES institutions(id),
  bureau_code          TEXT NOT NULL REFERENCES bureaus(code),
  category             TEXT NOT NULL,          -- from constants.CATEGORIES
  category_source      TEXT NOT NULL DEFAULT 'MANUAL' CHECK (category_source IN ('MANUAL','SUGGESTED_CONFIRMED')),
  source_channel       TEXT NOT NULL CHECK (source_channel IN ('EMAIL','LETTER','CPGRAMS','MINISTRY','VIP','COURT','RTI','PARLIAMENT','OTHER')),
  description          TEXT NOT NULL,
  status               TEXT NOT NULL CHECK (status IN ('NEW','UNDER_PROCESS','PENDING','TRANSFERRED','ESCALATED','DISPOSED')),
  assigned_officer_id  INTEGER REFERENCES users(id),
  received_on          TEXT NOT NULL,          -- YYYY-MM-DD
  sla_days             INTEGER NOT NULL,       -- copied from sla_config at creation
  due_on               TEXT NOT NULL,          -- computed: received_on + sla_days
  disposed_on          TEXT,
  last_action_at       TEXT NOT NULL DEFAULT (datetime('now')),
  created_by           INTEGER NOT NULL REFERENCES users(id),
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now')),
  version              INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_cases_institution ON cases(institution_id);
CREATE INDEX IF NOT EXISTS idx_cases_bureau_status ON cases(bureau_code, status);

CREATE TABLE IF NOT EXISTS actions (              -- append-only history
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id      TEXT NOT NULL REFERENCES cases(id),
  actor_id     INTEGER NOT NULL REFERENCES users(id),
  actor_bureau TEXT,
  action_type  TEXT NOT NULL,                     -- see 5.3
  from_status  TEXT,
  to_status    TEXT,
  remark       TEXT,
  visibility   TEXT NOT NULL DEFAULT 'SHARED' CHECK (visibility IN ('SHARED','INTERNAL')),
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_actions_case ON actions(case_id);

CREATE TABLE IF NOT EXISTS documents (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id     TEXT NOT NULL REFERENCES cases(id),
  file_name   TEXT NOT NULL,
  stored_path TEXT NOT NULL,
  mime_type   TEXT NOT NULL,
  size_bytes  INTEGER NOT NULL,
  uploaded_by INTEGER NOT NULL REFERENCES users(id),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS overlaps (              -- one group per institution at a time
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL REFERENCES institutions(id),
  status         TEXT NOT NULL CHECK (status IN ('OPEN','COORDINATING','LINKED','DISMISSED','REVIEWED')),
  severity       TEXT NOT NULL CHECK (severity IN ('HIGH','MEDIUM','LOW')),
  lead_bureau    TEXT REFERENCES bureaus(code),
  notes          TEXT,
  reviewed_by    INTEGER REFERENCES users(id),
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS overlap_members (
  overlap_id     INTEGER NOT NULL REFERENCES overlaps(id),
  case_id        TEXT NOT NULL REFERENCES cases(id),
  similarity     REAL NOT NULL,                  -- 0.0 to 1.0
  member_state   TEXT NOT NULL CHECK (member_state IN ('DETECTED','LINKED','NOT_RELATED')),
  PRIMARY KEY (overlap_id, case_id)
);

CREATE TABLE IF NOT EXISTS sla_config (
  category    TEXT PRIMARY KEY,
  days        INTEGER NOT NULL,
  updated_by  INTEGER REFERENCES users(id),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 5.2 Constants (`src/config/constants.js`, owner: Dev A, read by all)

```js
export const ROLES = ['OFFICER', 'HEAD', 'COORDINATOR', 'MANAGEMENT', 'ADMIN'];
export const BUREAUS = ['RB', 'PGRC', 'RO', 'CELL'];
export const CATEGORIES = [
  'FEES', 'INTAKE', 'FACULTY', 'INFRASTRUCTURE', 'RAGGING', 'NORM_VIOLATION', 'OTHER'
];
export const SOURCE_CHANNELS = ['EMAIL','LETTER','CPGRAMS','MINISTRY','VIP','COURT','RTI','PARLIAMENT','OTHER'];
export const CASE_STATUSES = ['NEW','UNDER_PROCESS','PENDING','TRANSFERRED','ESCALATED','DISPOSED'];
export const OPEN_STATUSES = CASE_STATUSES.filter(s => s !== 'DISPOSED');
```

### 5.3 Action types (the `actions.action_type` values)

`REGISTERED`, `CATEGORY_CONFIRMED`, `STATUS_CHANGED`, `REMARK_ADDED`, `DOCUMENT_ADDED`, `TRANSFERRED`, `ASSIGNED`, `ESCALATED`, `DISPOSED`, `REOPENED`, `OVERLAP_DETECTED`, `OVERLAP_LINKED`, `OVERLAP_NOT_RELATED`, `LEAD_BUREAU_SET`.

### 5.4 Case ID generation (`src/utils/caseId.js`)

Format: `BUREAU/YEAR/NNNNN`, for example `PGRC/2026/00064`.

Inside the register transaction:

1. `INSERT INTO case_counters (bureau_code, year, last_seq) VALUES (?, ?, 0) ON CONFLICT DO NOTHING`
2. `UPDATE case_counters SET last_seq = last_seq + 1 WHERE bureau_code = ? AND year = ?`
3. Read `last_seq` and format it with padding.

Because the whole registration runs in one transaction, two officers cannot receive the same number.

---

## 6. API routes

Base path: `/api`. All routes except `POST /api/auth/login` and `GET /api/health` need authentication.

Column meanings: **Roles** = allowed roles. **Owner** = the developer who builds it.

### 6.1 Health and reference data

| Method | Path | Roles | Function | Owner |
|---|---|---|---|---|
| GET | `/api/health` | public | Returns `{ status: "ok", time }`. Used to check the server runs | A |
| GET | `/api/bureaus` | any | Lists active bureaus | A |
| GET | `/api/categories` | any | Lists categories with keyword hints for the frontend | B |
| GET | `/api/sla-config` | any | Lists the deadline in days per category | C |
| PATCH | `/api/sla-config/:category` | ADMIN | Changes the deadline for future cases only | C |

### 6.2 Auth and users

| Method | Path | Roles | Function | Owner |
|---|---|---|---|---|
| POST | `/api/auth/login` | public (rate limited) | Checks username and password, returns token and user | A |
| GET | `/api/auth/me` | any | Returns the current user | A |
| GET | `/api/users` | ADMIN | Lists users (no password hashes) | A |
| POST | `/api/users` | ADMIN | Creates a user with a temporary password | A |
| PATCH | `/api/users/:id` | ADMIN | Updates name, role, bureau, region, active flag | A |
| POST | `/api/users/:id/reset-password` | ADMIN | Sets a new temporary password | A |
| GET | `/api/users?bureau=RB&role=OFFICER` | HEAD (own bureau), ADMIN | Lists officers for assignment dropdowns | A |

Login example:

```json
// POST /api/auth/login
{ "username": "officer.rb1", "password": "Demo@123" }

// 200
{
  "data": {
    "token": "eyJhbGciOi...",
    "user": { "id": 3, "username": "officer.rb1", "fullName": "Shri Rajesh Kumar", "role": "OFFICER", "bureau": "RB", "region": "North" }
  }
}
```

### 6.3 Institutions

| Method | Path | Roles | Function | Owner |
|---|---|---|---|---|
| GET | `/api/institutions?q=&region=&page=&pageSize=` | any | Searches by name (normalized) or Permanent ID | B |
| GET | `/api/institutions/:id` | any | Profile: details plus case counts by status and bureau | B |
| GET | `/api/institutions/:id/cases` | any (visibility applied) | All cases for this institution across bureaus, filterable by status, bureau, date | B |
| GET | `/api/institutions/:id/overlaps` | any | Open and linked overlap groups for this institution | B |
| POST | `/api/institutions` | ADMIN | Adds an institution to the master list | B |
| PATCH | `/api/institutions/:id` | ADMIN | Updates details. Recomputes `normalized_name` | B |

Search example:

```
GET /api/institutions?q=hillcrest inst tech
```

Returns institutions ordered by match score (see 7.2, matching service).

### 6.4 Matching and suggestions (used while registering a case)

| Method | Path | Roles | Function | Owner |
|---|---|---|---|---|
| POST | `/api/suggest` | OFFICER, HEAD | Given a typed college name and a description, returns the best institution matches and a suggested category with confidence | B |

```json
// POST /api/suggest
{ "institutionName": "Hillcrest Inst. of Tech.", "description": "Charging fees not approved by AICTE" }

// 200
{
  "data": {
    "institutionCandidates": [
      { "id": 12, "name": "Hillcrest Institute of Technology", "permanentId": "AICTE-PID-0012", "score": 0.93 },
      { "id": 19, "name": "Hillcrest Institute of Management", "permanentId": "AICTE-PID-0019", "score": 0.71 }
    ],
    "category": {
      "suggested": "FEES",
      "confidence": 0.82,
      "alternatives": ["INTAKE", "OTHER"]
    }
  }
}
```

If the best candidate scores below 0.85, the frontend must ask the officer to pick from the list. The backend still returns the list.

### 6.5 Cases

| Method | Path | Roles | Function | Owner |
|---|---|---|---|---|
| GET | `/api/cases` | any (visibility applied) | List with filters: `bureau, status, category, institutionId, q, overdue=true, from, to, sort, page, pageSize` | A |
| POST | `/api/cases` | OFFICER, HEAD | Register a case. Runs overlap check after commit (B's function) | A |
| GET | `/api/cases/:id` | any (visibility applied) | Full case: details, SLA state, linked overlap summary, documents, recent actions | A |
| PATCH | `/api/cases/:id` | owning bureau OFFICER or HEAD | Edit category or description (requires `version`) | A |
| POST | `/api/cases/:id/status` | owning bureau OFFICER or HEAD | Move to a new status from the transition table (requires `version`) | A |
| POST | `/api/cases/:id/remarks` | owning bureau; MANAGEMENT cannot | Add a remark, `visibility` SHARED or INTERNAL | A |
| POST | `/api/cases/:id/transfer` | owning bureau OFFICER or HEAD | Transfer to another bureau. Status becomes TRANSFERRED | A |
| POST | `/api/cases/:id/accept-transfer` | receiving bureau OFFICER or HEAD | Accept a transferred case. Status becomes UNDER_PROCESS | A |
| POST | `/api/cases/:id/assign` | owning bureau HEAD | Assign an officer from the same bureau | A |
| POST | `/api/cases/:id/escalate` | owning bureau OFFICER or HEAD | Move to ESCALATED and notify head (see 7.3) | A |
| POST | `/api/cases/:id/dispose` | owning bureau HEAD | Move to DISPOSED, set `disposed_on` | A |
| POST | `/api/cases/:id/reopen` | owning bureau HEAD | Move DISPOSED back to UNDER_PROCESS | A |
| GET | `/api/cases/:id/actions` | any (visibility applied) | Full history, newest first, paginated | A |
| POST | `/api/cases/:id/documents` | owning bureau OFFICER or HEAD | Upload one file (multipart field `file`) | A |
| GET | `/api/cases/:id/documents/:docId` | any with case access | Download a file (streamed, never a static path) | A |

Register case example:

```json
// POST /api/cases
{
  "institutionId": 12,
  "category": "FEES",
  "sourceChannel": "CPGRAMS",
  "receivedOn": "2026-10-20",
  "description": "College is charging fees not approved by AICTE for the current year."
}

// 201
{
  "data": {
    "case": {
      "id": "PGRC/2026/00064",
      "institution": { "id": 12, "name": "Hillcrest Institute of Technology" },
      "bureau": "PGRC",
      "category": "FEES",
      "status": "NEW",
      "dueOn": "2026-11-10",
      "slaState": "ON_TRACK",
      "version": 1
    },
    "overlap": { "found": true, "overlapId": 7, "severity": "HIGH", "otherCases": 1 }
  }
}
```

Update case with version check:

```json
// POST /api/cases/PGRC~2026~00064/status   (ids with slashes are URL-encoded as %2F)
{ "toStatus": "UNDER_PROCESS", "remark": "Letter sent to college seeking fee approval", "version": 1 }

// 409 if the case changed meanwhile
{ "error": { "code": "VERSION_CONFLICT", "message": "Case was updated by someone else", "details": { "currentVersion": 2 } } }
```

Case ID in URLs: the slash is URL-encoded (`PGRC%2F2026%2F00064`). Express decodes it automatically. Routes must use `:id(*)` or encode the slash on the client. **Decision for the whole team:** the frontend sends `encodeURIComponent(caseId)` and the backend uses a single segment `:id`.

Case detail visibility example (what a non-owner sees):

```json
{
  "data": {
    "id": "RB/2026/00376",
    "bureau": "RB",
    "category": "INFRASTRUCTURE",
    "status": "UNDER_PROCESS",
    "officer": null,
    "description": null,
    "accessLevel": "LIMITED",
    "linkedOverlap": { "id": 7, "severity": "HIGH" }
  }
}
```

A case from another bureau returns `accessLevel: "LIMITED"` and hides `description`, `officer` and `INTERNAL` actions. This is the need-to-know rule.

### 6.6 Overlaps (coordination)

| Method | Path | Roles | Function | Owner |
|---|---|---|---|---|
| GET | `/api/overlaps?status=&severity=&bureau=&page=` | COORDINATOR, MANAGEMENT, ADMIN, HEAD, OFFICER (own bureau only) | List overlap groups with case counts and bureaus involved | B |
| GET | `/api/overlaps/:id` | same as list | Group detail with members (limited fields for non-owners) and suggested lead bureau | B |
| POST | `/api/overlaps/:id/link` | COORDINATOR | Link selected cases (`caseIds`), set `leadBureau`, add `notes`. Status becomes LINKED | B |
| POST | `/api/overlaps/:id/not-related` | COORDINATOR | Mark selected cases as NOT_RELATED. If none remain related, status becomes DISMISSED | B |
| POST | `/api/overlaps/:id/review` | COORDINATOR | Mark the group as REVIEWED with notes | B |
| POST | `/api/overlaps/:id/unlink/:caseId` | COORDINATOR | Remove one case from a linked group | B |

Link example:

```json
// POST /api/overlaps/7/link
{
  "caseIds": ["PGRC/2026/00064", "RB/2026/00376"],
  "leadBureau": "PGRC",
  "notes": "Both cases concern the same institution's fee and intake practices. PGRC to lead."
}

// 200
{
  "data": {
    "id": 7,
    "status": "LINKED",
    "leadBureau": "PGRC",
    "members": [
      { "caseId": "PGRC/2026/00064", "similarity": 0.91, "memberState": "LINKED" },
      { "caseId": "RB/2026/00376", "similarity": 0.84, "memberState": "LINKED" }
    ]
  }
}
```

### 6.7 Dashboard (read only)

| Method | Path | Roles | Function | Owner |
|---|---|---|---|---|
| GET | `/api/dashboard/summary?bureau=&region=&from=&to=` | any role with read access | Counts by status, overdue count, open overlap count, total | C |
| GET | `/api/dashboard/workload` | HEAD (own bureau), MANAGEMENT, ADMIN | Open cases per bureau and per officer | C |
| GET | `/api/dashboard/ageing` | MANAGEMENT, HEAD, COORDINATOR | Open cases grouped into age bands: 0-7, 8-14, 15-21, 22+ days | C |
| GET | `/api/dashboard/top-overdue?limit=10` | MANAGEMENT, HEAD, COORDINATOR | Overdue cases sorted by days overdue | C |
| GET | `/api/dashboard/monthly-disposal?year=2026` | MANAGEMENT, ADMIN | Count of disposed cases per month | C |
| GET | `/api/dashboard/region-summary` | MANAGEMENT | Counts per region | C |

Summary response:

```json
{
  "data": {
    "total": 200,
    "byStatus": { "NEW": 18, "UNDER_PROCESS": 62, "PENDING": 24, "TRANSFERRED": 9, "ESCALATED": 11, "DISPOSED": 76 },
    "overdue": 14,
    "openOverlapGroups": 6
  }
}
```

### 6.8 Reports and imports

| Method | Path | Roles | Function | Owner |
|---|---|---|---|---|
| GET | `/api/reports/:type?format=json|xlsx&bureau=&region=&from=&to=` | MANAGEMENT, HEAD, ADMIN | Types: `institution-wise`, `region-wise`, `bureau-wise`, `ageing`, `overlaps`. Returns JSON or an Excel file | C |
| GET | `/api/imports/template` | OFFICER, HEAD, ADMIN | Downloads an empty `.xlsx` with the correct column headers | C |
| POST | `/api/imports/cases?dryRun=true` | OFFICER, HEAD | Uploads an `.xlsx`, validates every row, and returns row-level errors. Without `dryRun` it creates the valid rows | C |

Import rules: maximum 2,000 rows per file, each row goes through the same validation as `POST /api/cases`, rows are inserted in one transaction, and the response lists errors per row number.

### 6.9 Routes with an unusual shape

- `POST /api/cases/:id/documents` accepts `multipart/form-data`. Limit 10 MB, allowed types `application/pdf`, `image/jpeg`, `image/png`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`. Check the MIME type from the file signature (magic bytes), not only the extension.
- Documents are saved to `UPLOAD_DIR` with generated file names (UUID), never the original name.

---

## 7. Services and functions

Each function below lists its owner and what it must do. Function names are suggestions, but keep them if they match.

### 7.1 Core services (Dev A)

| Function | File | What it does |
|---|---|---|
| `login(username, password)` | `auth.service.js` | Finds user, checks `active`, compares hash, returns token and user |
| `registerCase(input, actor)` | `cases.service.js` | In one transaction: validate bureau of actor, generate case ID, compute `sla_days` and `due_on`, insert case, insert `REGISTERED` action. After commit, calls `overlapService.checkForCase(caseId)` (Dev B) |
| `getCaseForViewer(caseId, viewer)` | `cases.service.js` | Returns full view or limited view depending on the rules in 4.6 and 6.5 |
| `updateCase(caseId, patch, actor)` | `cases.service.js` | Checks owner bureau, version, and that the case is not DISPOSED. Writes `CATEGORY_CONFIRMED` when category changes. If category changed, calls `overlapService.recheckForCase` |
| `changeStatus(caseId, toStatus, remark, actor, version)` | `cases.service.js` | Checks `TRANSITIONS`, HEAD-only rules, version. Updates status and `last_action_at`. Writes `STATUS_CHANGED` action. Sets `disposed_on` on DISPOSED |
| `transferCase(caseId, toBureau, remark, actor, version)` | `cases.service.js` | Sets bureau to `toBureau` only after acceptance. Until then the case stays with the sender and status becomes TRANSFERRED. Writes `TRANSFERRED` |
| `acceptTransfer(caseId, actor, version)` | `cases.service.js` | Receiving bureau takes ownership: `bureau_code` changes, status becomes UNDER_PROCESS, assigned officer cleared |
| `assignOfficer(caseId, officerId, actor, version)` | `cases.service.js` | Checks officer belongs to the same bureau. Writes `ASSIGNED` |
| `escalateCase(caseId, remark, actor, version)` | `cases.service.js` | Status becomes ESCALATED. Writes `ESCALATED`. Head sees it in the top-overdue and escalation lists |
| `addRemark(caseId, text, visibility, actor)` | `actions.service.js` | Writes `REMARK_ADDED` with visibility. Does not change status or version |
| `getActions(caseId, viewer, pagination)` | `actions.service.js` | Applies the visibility filter from 4.6 in the SQL |
| `saveDocument(caseId, file, actor)` | `documents.service.js` | Validates type by magic bytes, stores with UUID name, inserts row, writes `DOCUMENT_ADDED` |
| `streamDocument(docId, viewer)` | `documents.service.js` | Checks access, streams the file with a correct `Content-Type` and `Content-Disposition` |
| `listUsers(filters, actor)` and user admin functions | `users.service.js` | Admin user management. Never returns `password_hash` |
| `canView(caseRow, viewer)` and `canEdit(caseRow, viewer)` | `access.js` | Single source of permission rules used by services |

Access helper (shared, owner Dev A, used by everyone):

```js
// src/utils/access.js
export function canEdit(caseRow, user) {
  const sameBureau = user.bureau === caseRow.bureau_code;
  return sameBureau && (user.role === 'OFFICER' || user.role === 'HEAD');
}
export function viewLevel(caseRow, user) {
  if (user.role === 'ADMIN' || user.role === 'MANAGEMENT' || user.role === 'COORDINATOR') return 'FULL';
  if (user.bureau === caseRow.bureau_code) return 'FULL';
  return 'LIMITED';   // other bureau: basic metadata only
}
```

### 7.2 Matching and overlap services (Dev B)

| Function | File | What it does |
|---|---|---|
| `normalizeName(raw)` | `utils/text.js` | Lowercases, removes punctuation, expands abbreviations (see table below), collapses spaces |
| `similarity(a, b)` | `utils/similarity.js` | Returns 0 to 1 using levenshtein distance: `1 - distance / maxLength` |
| `tokenJaccard(a, b)` | `utils/similarity.js` | Returns overlap of word sets, used for issue similarity |
| `findInstitutionCandidates(name, limit = 3)` | `matching.service.js` | Compares normalized name against all active institutions. Returns candidates with score, ordered |
| `suggestCategory(description)` | `matching.service.js` | Scores each category by keyword hits in the description. Returns best category, confidence (hits share, capped 0 to 1) and alternatives |
| `checkForCase(caseId)` | `overlap.service.js` | Called after a case is registered. Finds other open cases for the same institution in other bureaus. If any, creates or updates an overlap group and writes `OVERLAP_DETECTED` on the new case |
| `recheckForCase(caseId)` | `overlap.service.js` | Called after a category change or reopening. Updates similarity scores and severity |
| `computeSeverity(members)` | `overlap.service.js` | HIGH if any pair has the same category or similarity at least 0.5. MEDIUM otherwise |
| `linkCases(overlapId, caseIds, leadBureau, notes, actor)` | `overlap.service.js` | Sets member states to LINKED, sets lead bureau, writes `OVERLAP_LINKED` on each case, status LINKED |
| `markNotRelated(overlapId, caseIds, notes, actor)` | `overlap.service.js` | Sets NOT_RELATED, writes `OVERLAP_NOT_RELATED`, dismisses group if no related members remain |
| `reviewOverlap(overlapId, notes, actor)` | `overlap.service.js` | Status REVIEWED, records reviewer |

Abbreviations table for `normalizeName`:

| Short | Expanded |
|---|---|
| inst, instt | institute |
| tech | technology |
| engg, eng | engineering |
| clg | college |
| univ | university |
| govt | government |
| sci | science |
| mgmt, mgt | management |
| & | and |

Overlap detection rules (the heart of the project):

1. A new case for institution `I` in bureau `B` is compared with every OPEN case for `I` whose bureau is not `B`.
2. For each candidate: `issue = 0.6 * tokenJaccard(description_a, description_b) + 0.4 * (category_a === category_b ? 1 : 0)`.
3. Members with `issue >= 0.2`, or any member if the category matches, join the group.
4. If no existing OPEN or LINKED group exists for `I`, create one. Otherwise add members to it.
5. Severity: HIGH if categories match or `issue >= 0.5`, MEDIUM otherwise.
6. The overlap check never changes case status and never closes anything.

Matching threshold: name score at least 0.85 counts as a confident match. Below that, the API returns candidates and the frontend asks the officer to choose.

### 7.3 Deadline and escalation logic (Dev C, used by Dev A)

`src/utils/sla.js` must be written first by Dev C, because Dev A depends on it for `due_on`.

```js
// src/utils/sla.js  (pure functions, no database access)
export function addDays(isoDate, days) {
  const d = new Date(isoDate + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(fromIso, toIso) {
  return Math.round((new Date(toIso) - new Date(fromIso)) / 86400000);
}

// Returns one of ON_TRACK, DUE_SOON, OVERDUE, DISPOSED
export function slaState(caseRow, todayIso) {
  if (caseRow.status === 'DISPOSED') return 'DISPOSED';
  const total = caseRow.sla_days;
  const elapsed = daysBetween(caseRow.received_on, todayIso);
  if (elapsed > total) return 'OVERDUE';
  if (elapsed >= Math.ceil(total * 0.8)) return 'DUE_SOON';
  return 'ON_TRACK';
}

// Interim-reply reminder points, used by the frontend and by reports
export const REMINDER_POINTS = [0.5, 0.8];
```

Escalation rule:

- Dev C's `escalation.service.js` runs when `GET /api/cases` or `GET /api/dashboard/*` is requested: it does not run a background job. For each open case with `slaState === 'OVERDUE'` and status not ESCALATED, it writes an `ESCALATED` action with `actor = system` (user id of the built-in `system` account, created by the seed) and sets status to ESCALATED.
- The escalation is idempotent: a case is escalated at most once per overdue period.

Config defaults (from `data/seed/sla-config.json`, example values only):

| Category | Days |
|---|---|
| FEES | 21 |
| INTAKE | 21 |
| FACULTY | 30 |
| INFRASTRUCTURE | 30 |
| RAGGING | 7 |
| NORM_VIOLATION | 21 |
| OTHER | 21 |

These are settings, not rules. State this in the submission.

### 7.4 Dashboard and report functions (Dev C)

| Function | File | What it does |
|---|---|---|
| `summaryCounts(filters)` | `dashboard.repo.js` | One GROUP BY query by status, plus overdue count |
| `workloadByOfficer(bureau)` | `dashboard.repo.js` | Open cases per officer in the bureau |
| `ageingBands(filters)` | `dashboard.repo.js` | Buckets by `julianday('now') - julianday(received_on)` |
| `topOverdue(limit)` | `dashboard.repo.js` | Overdue cases ordered by days overdue |
| `monthlyDisposal(year)` | `dashboard.repo.js` | `strftime('%m', disposed_on)` grouping |
| `buildReport(type, filters)` | `reports.service.js` | Returns rows for the chosen report type |
| `toXlsx(rows, sheetName)` | `reports.service.js` | Converts rows to a workbook buffer with the `xlsx` package |
| `importCasesFromBuffer(buffer, actor, dryRun)` | `imports.service.js` | Parses sheet, validates each row with the case schema, inserts valid rows in one transaction |

Report formats: JSON by default, `format=xlsx` returns `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.

Import template columns (in this order): `institution_permanent_id`, `category`, `source_channel`, `received_on`, `description`, `bureau`.

---

## 8. Seed data and reset

`npm run db:reset` runs `scripts/reset-db.js`, which:

1. Deletes `data/app.db` if it exists.
2. Applies `schema.sql`.
3. Inserts bureaus from `data/seed/bureaus.json`.
4. Inserts users from `data/seed/users.json`.
5. Inserts institutions from `data/seed/institutions.json`.
6. Inserts SLA config from `data/seed/sla-config.json`.
7. Inserts cases from `data/seed/cases.json` by calling `cases.service.registerCase` so that case IDs, due dates and overlaps are created by the real code, not by hand.

Seed content requirements (owner Dev C):

- 40 fictional institutions with fictional Permanent IDs such as `AICTE-PID-0012`.
- 200 cases across RB, PGRC and RO, all categories and statuses represented.
- At least 15 deliberate overlaps, including misspelled college names (for example "Hillcrest Inst. of Tech.").
- At least 10 overdue cases and 5 transferred cases.
- Fictional names only. No real officers or complainants.

Demo users (password for all: `Demo@123`, change before any shared deployment):

| Username | Role | Bureau |
|---|---|---|
| `officer.rb1` | OFFICER | RB |
| `officer.pgrc1` | OFFICER | PGRC |
| `head.rb` | HEAD | RB |
| `head.pgrc` | HEAD | PGRC |
| `coordinator` | COORDINATOR | none |
| `management` | MANAGEMENT | none |
| `admin` | ADMIN | none |
| `system` | ADMIN | none (used for automatic actions, cannot log in) |

Set `password_hash` for `system` to a random value that no one knows.

---

## 9. Work split for three developers

### 9.1 Overview

| | Dev A: Core platform and cases | Dev B: Matching and overlaps | Dev C: Analytics, SLA, data |
|---|---|---|---|
| Share of work | About 45% | About 30% | About 25% |
| Why uneven | Everyone depends on the schema, auth and case rules, so this person does the foundation | Overlap logic is hard but touches fewer endpoints | Dashboards and reports are mostly SQL, and seed data is important but repetitive |
| Routes owned | Auth, users, bureaus, cases, actions, documents | Institutions, suggest, overlaps, categories | SLA config, dashboard, reports, imports, health |
| Services owned | auth, users, cases, actions, documents, access | text, similarity, matching, overlap | sla, escalation, dashboard, reports, imports |
| Files owned | `app.js`, `server.js`, `db/*`, `middleware/*`, `config/*`, `utils/ApiError.js`, `utils/access.js` | `utils/text.js`, `utils/similarity.js`, matching and overlap modules | `utils/sla.js`, `utils/dates.js`, seed data, reset script, dashboard/report/import modules |

### 9.2 Dev A: Core platform and cases

Responsibilities:

1. Project scaffold, `package.json`, `.env.example`, `app.js`, `server.js`.
2. Database connection, `schema.sql`, `migrate.js`, `constants.js`.
3. Error handling, response helpers, `validate` middleware, `authenticate`, `authorize`.
4. Auth module: login, me, rate limit.
5. Users module (admin) and bureaus reference.
6. Cases module: register, list, read (with visibility), update, status change, transfer, accept transfer, assign, escalate, dispose, reopen.
7. Actions module: history and remarks.
8. Documents module: upload with magic-byte check, download streaming.
9. Access helpers (`canEdit`, `viewLevel`) used by all modules.

Deliver first (before anyone else needs them):

- `schema.sql`, `constants.js`, `db/connection.js`, `ApiError`, `validate`, `authenticate`. Push these within the first working session, because Dev B and Dev C build against them.

### 9.3 Dev B: Matching and overlaps

Responsibilities:

1. `utils/text.js` (normalizeName with abbreviation table) and `utils/similarity.js`. These have no database dependency, so start here.
2. Institutions module: list and search, profile, institution cases, institution overlaps, admin create and update.
3. Matching module: `findInstitutionCandidates`, `suggestCategory`, `POST /api/suggest`, `GET /api/categories`.
4. Overlap module: `checkForCase`, `recheckForCase`, severity, grouping, list and detail routes, link, not-related, review, unlink.
5. Unit tests for normalization, similarity and the overlap rules (the most important tests in the project).

Interfaces you must agree with Dev A:

- Dev A calls `overlapService.checkForCase(caseId)` after commit in `registerCase`.
- Dev A calls `overlapService.recheckForCase(caseId)` after a category change or a reopen.
- Dev B's overlap routes use Dev A's `canView` and `viewLevel` helpers, so that LIMITED views hide what they must.

Agree these two function signatures in the first hour and do not change them without telling the team.

### 9.4 Dev C: Analytics, deadlines and data

Responsibilities:

1. `utils/sla.js` and `utils/dates.js`. Write these first, because Dev A needs `addDays` for `due_on`.
2. SLA config module: read and admin update (future cases only, does not change existing `sla_days`).
3. Escalation service (runs on read, idempotent, writes `ESCALATED` with the system user).
4. Dashboard module: summary, workload, ageing, top overdue, monthly disposal, region summary.
5. Reports module: five report types, JSON and xlsx.
6. Imports module: template download and bulk upload with dry run.
7. Seed data (`data/seed/*.json`) and `scripts/reset-db.js`. The seed loads cases through `registerCase`, so the seed also tests Dev A and Dev B's code early.
8. Integration tests for dashboards and reports against the seed data.

Start with: `sla.js`, `dates.js`, and the seed JSON files (institutions and cases can be written without the database). Then the dashboard repo queries, which only need the schema.

### 9.5 Dependency order

```
Phase 1 (parallel, no waiting)
  Dev A: schema.sql, constants.js, db connection, ApiError, validate, authenticate, authorize
  Dev B: text.js, similarity.js, unit tests for both
  Dev C: sla.js, dates.js, seed JSON files, sla-config.json

Phase 2 (needs Phase 1)
  Dev A: auth, users, bureaus, then cases register/read/list
  Dev B: institutions repo and routes, matching service (uses seed institutions)
  Dev C: dashboard repo queries and routes, reset script (uses schema and seed)

Phase 3 (needs Phase 2)
  Dev A: status change, transfer, assign, escalate, dispose, reopen, actions, documents
  Dev B: overlap checkForCase, overlap routes, link and not-related   (needs cases from Dev A)
  Dev C: reports, imports, escalation service                          (needs cases from Dev A)

Phase 4 (everyone)
  Integration: run reset, run the full demo path, fix mismatches, write integration tests
```

Phase 2 can start for Dev B and Dev C only after Dev A pushes the schema. Phase 3 needs Dev A's `registerCase` and status services in `dev`. If Dev A is late, Dev B and Dev C should build against the seed data and mock the case rows, but must not copy case logic into their own modules.

### 9.6 Interdependencies to watch

| Dependency | From | To | Risk and mitigation |
|---|---|---|---|
| Schema and constants | A | B, C | Changes break everyone. Announce every change and pull `dev` before editing |
| `sla.addDays` for `due_on` | C | A | Write `sla.js` first. A can stub it temporarily as `received_on + 21` |
| `checkForCase` after register | B | A | Agree signature in Phase 1. Until B is done, A uses a no-op stub |
| `canView` and `viewLevel` | A | B, C | Dashboard and overlap views must respect the same rules. A writes them first |
| Seed through `registerCase` | A, B | C | Seed script fails if A or B is late. C writes seed JSON early, runs the script once A is ready |
| Overlap severity and dashboard counts | B | C | Dashboard counts only open overlap groups. Agree the status values in `constants.js` |

### 9.7 Hand-off checklist

Before a module is considered finished, its owner confirms:

- [ ] Every route in section 6 for that module exists with the stated roles.
- [ ] Input validated with a zod schema, and invalid input returns `400 VALIDATION_FAILED`.
- [ ] Wrong role returns `403`, missing token returns `401`, unknown ID returns `404`.
- [ ] Every write that changes a case writes an action row in the same transaction.
- [ ] Remarks respect `visibility` in the SQL.
- [ ] At least one happy-path test and one failure-path test per route.
- [ ] Route table in section 6 updated if anything changed.
- [ ] `npm run db:reset` still works after the merge.

---

## 10. Testing

| Type | Location | Owner | What to cover |
|---|---|---|---|
| Unit | `tests/unit/` | B (text, similarity, overlap rules), C (sla, dates) | Pure functions with edge cases: empty names, very long descriptions, dates on month end |
| Integration | `tests/integration/` | Each module owner | Real routes via supertest against a test database |
| Demo path | `tests/integration/demo-flow.test.js` | Lead (or A) | The full story: register at PGRC, register at RB, overlap appears, link, escalate, dispose |

Test database: `DB_PATH=./data/test.db`. Each test file runs `reset-db` in `beforeAll`. Tests must not depend on each other's data.

Helper example:

```js
// tests/helpers/login.js
export async function loginAs(app, username) {
  const res = await request(app).post('/api/auth/login').send({ username, password: 'Demo@123' });
  return res.body.data.token;
}
```

Minimum before merging to `main`: all tests green, `npm run db:reset` works, and the demo path test passes.

---

## 11. Security checklist

- [ ] `helmet()` and `cors({ origin: env.CORS_ORIGIN })` set in `app.js`.
- [ ] Login rate limit: 10 attempts per 15 minutes per IP.
- [ ] Passwords hashed with bcrypt. `password_hash` never returned by any route.
- [ ] `JWT_SECRET` is at least 32 random characters in any shared environment.
- [ ] Uploads: size limit, MIME check by magic bytes, UUID file names, stored outside any static folder, streamed only through the authorized route.
- [ ] All SQL uses prepared statements with placeholders.
- [ ] Error handler hides stack traces unless `NODE_ENV=development`.
- [ ] Complainant names and personal details are never placed in `actions.remark` automatically.
- [ ] `system` account cannot log in.

---

## 12. Definition of done (whole backend)

1. `npm run db:reset` produces a database with 40 institutions, 200 cases and the demo users.
2. Each demo user can log in and sees only what section 4.1 allows.
3. An officer in PGRC registers a fee case for "Hillcrest Inst. of Tech.". The suggest endpoint finds "Hillcrest Institute of Technology" and suggests FEES.
4. An officer in RB registers a related case for the same institution. An overlap group appears with severity and both cases.
5. A coordinator links the two cases and sets PGRC as lead. Both officers see the banner through their case detail.
6. An RB officer viewing the PGRC case gets `accessLevel: LIMITED` and cannot see its description or internal remarks.
7. An overdue case appears in the top-overdue list and is escalated once.
8. Management can open the summary, workload, ageing and report endpoints. Management cannot call any write endpoint (returns 403).
9. Every route in section 6 returns the documented envelope. The frontend team has checked each shape against the sample JSON.
10. The test suite passes.

---

## 13. Open decisions (agree in the first meeting)

| Decision | Recommended default |
|---|---|
| Case ID in URLs | Frontend encodes the slash: `encodeURIComponent("PGRC/2026/00064")` |
| Dates in responses | ISO date strings `YYYY-MM-DD` |
| Pagination | `page` starts at 1, `pageSize` default 25, maximum 100 |
| Sorting | `sort=field:asc` or `sort=field:desc`, whitelisted fields only |
| Who can see a LIMITED case | Only its existence, bureau, category and status. Never description or officer |
| Transfer | Ownership changes only when the receiving bureau accepts |
| Deadlines | Computed on read, no background timer |

If any decision above changes, update this document and tell the team.
