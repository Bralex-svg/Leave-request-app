-- LeaveFlow schema

CREATE TABLE IF NOT EXISTS organisations (
  id                     SERIAL PRIMARY KEY,
  name                   TEXT NOT NULL,
  leave_year_start_month INTEGER NOT NULL DEFAULT 1,
  branding               JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS departments (
  id           SERIAL PRIMARY KEY,
  org_id       INTEGER NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  hod_user_id  INTEGER, -- FK added after users table exists
  UNIQUE (org_id, name)
);

CREATE TYPE user_role AS ENUM ('staff', 'hod', 'hr', 'principal');

CREATE TABLE IF NOT EXISTS users (
  id             SERIAL PRIMARY KEY,
  org_id         INTEGER NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  department_id  INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  name           TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  role           user_role NOT NULL,
  title          TEXT NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE departments
  ADD CONSTRAINT departments_hod_user_id_fkey
  FOREIGN KEY (hod_user_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE TYPE approval_chain AS ENUM ('hod_only', 'hod_then_hr');

CREATE TABLE IF NOT EXISTS leave_types (
  id               SERIAL PRIMARY KEY,
  org_id           INTEGER NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  key              TEXT NOT NULL,
  name             TEXT NOT NULL,
  entitlement_days INTEGER, -- null = case-by-case
  approval_chain   approval_chain NOT NULL DEFAULT 'hod_then_hr',
  active           BOOLEAN NOT NULL DEFAULT true,
  emoji            TEXT NOT NULL DEFAULT '',
  color            TEXT NOT NULL DEFAULT '#1F5C4D',
  tint             TEXT NOT NULL DEFAULT '#E2F0E9',
  sort_order       INTEGER NOT NULL DEFAULT 0,
  UNIQUE (org_id, key)
);

CREATE TYPE request_status AS ENUM ('pending_hod', 'pending_hr', 'approved', 'declined');

CREATE TABLE IF NOT EXISTS leave_requests (
  id             SERIAL PRIMARY KEY,
  org_id         INTEGER NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  leave_type_id  INTEGER NOT NULL REFERENCES leave_types(id),
  start_date     DATE NOT NULL,
  end_date       DATE NOT NULL,
  days           INTEGER NOT NULL,
  reason         TEXT NOT NULL,
  status         request_status NOT NULL DEFAULT 'pending_hod',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE approval_step AS ENUM ('hod', 'hr');
CREATE TYPE approval_decision AS ENUM ('approved', 'declined');

CREATE TABLE IF NOT EXISTS approvals (
  id           SERIAL PRIMARY KEY,
  request_id   INTEGER NOT NULL REFERENCES leave_requests(id) ON DELETE CASCADE,
  approver_id  INTEGER NOT NULL REFERENCES users(id),
  step         approval_step NOT NULL,
  decision     approval_decision NOT NULL,
  note         TEXT NOT NULL DEFAULT '',
  decided_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS balances (
  id             SERIAL PRIMARY KEY,
  org_id         INTEGER NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  leave_type_id  INTEGER NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
  year           INTEGER NOT NULL,
  entitlement    INTEGER NOT NULL,
  used           INTEGER NOT NULL DEFAULT 0,
  UNIQUE (user_id, leave_type_id, year)
);

CREATE TABLE IF NOT EXISTS password_resets (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leave_requests_org ON leave_requests(org_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_user ON leave_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_balances_user_year ON balances(user_id, year);
CREATE INDEX IF NOT EXISTS idx_password_resets_token_hash ON password_resets(token_hash);
