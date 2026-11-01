# LeaveFlow

A multi-tenant leave request and approval platform. Staff submit leave requests, their Head of Department approves or declines, HR gives final confirmation and deducts the balance, and the Principal gets a read-only, org-wide analytics view.


## Core flow

```
Staff submits request → HoD approves/declines → HR finalises → balance deducted → staff notified
```

- Leave types with a **HoD-only** approval chain (Sick, Casual) skip the HR step and finalise — and deduct the balance — the moment the HoD approves.
- Every other type routes **HoD → HR**, with the balance only deducted at HR's final confirmation.
- A HoD only ever sees requests from their own department. HR and the Principal see the whole organisation.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 18 (Vite), React Router, Tailwind CSS |
| Backend | Node.js + Express (ESM), REST API |
| Database | PostgreSQL |
| Auth | JWT in an httpOnly cookie, bcrypt password hashing, role-based middleware |
| API docs | OpenAPI 3 via `swagger-jsdoc` + Swagger UI |

## Project structure

```
client/               React app (Vite + Tailwind)
  src/
    pages/             Screens, grouped by role (staff / hod / hr / principal)
    components/        Shared UI (modals, app shell, toast, away list)
    context/            Auth, organisation branding, and cross-screen UI state
    lib/                API client, formatting, role/nav config

server/               Express API
  src/
    routes/            One file per resource (auth, requests, balances, staff, leave-types, organisation, insights)
    middleware/        JWT auth + role-guard middleware
    db/                schema.sql, migrate.js, seed.js
    swagger.js          OpenAPI spec definition

docs/
  DESIGN_BRIEF.md      Original client handoff / design spec
  design/              Click-through HTML prototype (open in a browser)

docker-compose.yml     Local Postgres for development
```

## Getting started

**Prerequisites:** Node.js 20+, npm, and either Docker or a local PostgreSQL instance.

### 1. Start Postgres

```bash
docker compose up -d
```

This runs Postgres in a container, exposed on **`localhost:5433`** (mapped from the container's `5432`, so it won't clash with a Postgres instance you might already have running on the default port) with user/password/db all set to `leaveflow`. Prefer to use an existing Postgres server instead? Just point `DATABASE_URL` at it in the next step and skip this one.

### 2. Configure and set up the API

```bash
cd server
cp .env.example .env
npm install
npm run setup   # creates the schema and seeds demo data
npm run dev     # http://localhost:4000
```

`npm run setup` is destructive and idempotent — it drops and recreates every LeaveFlow table, then seeds an organisation, departments, users, leave types and sample requests. Run it again any time you want to reset to a clean demo state. It prints the demo logins when it finishes.

### 3. Run the frontend

```bash
cd client
npm install
npm run dev   # http://localhost:5173
```

The Vite dev server proxies `/api` to `http://localhost:4000`, so open **http://localhost:5173** and everything just works.

## Environment variables (`server/.env`)

| Variable | Purpose | Example |
|---|---|---|
| `DATABASE_URL` | Postgres connection string | `postgres://leaveflow:leaveflow@localhost:5433/leaveflow` |
| `JWT_SECRET` | Signing secret for session JWTs — **generate a real random value for any non-local environment** | `change-this-to-a-long-random-string` |
| `PORT` | API listen port | `4000` |
| `CLIENT_ORIGIN` | Allowed CORS origin for the frontend | `http://localhost:5173` |
| `COOKIE_SECURE` | Set to `true` once served over HTTPS, so the session cookie requires it | `false` |

`server/.env` is git-ignored — never commit real secrets. `server/.env.example` is the checked-in template; copy it to `.env` and fill in real values per environment.

## Demo data

The seed script populates **Saint Anne's Hospital, Damongo** — departments: Nursing, Maternity & Midwifery, Public Health, Administration.

```bash
cd server
npm run setup   # wipes the DB and reseeds the demo data
```

This is destructive (it drops and recreates every table), so it's a full reset each time. No restart of the API or frontend is needed; just reseed and refresh the browser.

All seeded users share the password `password123`.

| Role | Email | Home screen |
|---|---|---|
| Staff | `afia.owusu@stannes.health` | Overview |
| Head of Department | `salifu.adam@stannes.health` | Approvals |
| HR | `mary.kipo@stannes.health` | All requests |
| Executive (Medical Director) | `jk.nabila@stannes.health` | Insights |

The role card on the login screen is a UX affordance only — the API always derives the account's real role from the database and rejects the request if it doesn't match what was selected, with a message telling the user which role to pick instead.

The seed data lives in `server/src/db/profiles/hospital.js`, exporting `{ orgName, departments, users, staffBalances, requests, deptHod, demoLogins }`.

## API documentation

With the API running, interactive Swagger UI docs for every endpoint are at:

- **http://localhost:4000/api/docs**
- raw OpenAPI spec (JSON) at `http://localhost:4000/api/docs.json`

## Scripts reference

**`server/`**

| Script | Does |
|---|---|
| `npm run dev` | Start the API with `node --watch` (auto-restarts on file changes) |
| `npm start` | Start the API without watch mode (production) |
| `npm run migrate` | Drop and recreate the database schema |
| `npm run seed` | Seed demo data — see [Demo data](#demo-data) |
| `npm run setup` | `migrate` + `seed` in one step |

**`client/`**

| Script | Does |
|---|---|
| `npm run dev` | Start the Vite dev server with API proxying |
| `npm run build` | Production build to `client/dist/` |
| `npm run preview` | Preview the production build locally |

## Notes on business rules

- **Days** are counted as an inclusive calendar-day span (first day through last day, both included). Skipping weekends/holidays is a stated upgrade path, not implemented.
- Submitting a request is blocked server-side if the requested days exceed the staff member's remaining balance for that leave type/year.
- Balances are only deducted on **final** approval (HR confirmation, or immediately on HoD approval for HoD-only leave types) — never on submission or a mid-chain approval.
- "Who's away" widgets are scoped to the viewer's own department for staff/HoD (their actual colleagues), and organisation-wide for HR/Principal, who have institution-wide oversight.

## Deploying

The server serves the built client itself (`server/src/index.js` serves `client/dist/` and falls back to `index.html` for client-side routes whenever a build is present), so the whole app is one deployable service — no separate static host or reverse proxy needed. This also keeps the login cookie same-origin, which matters: it's set with `SameSite=Lax`, which browsers won't send on cross-site requests, so splitting the frontend and API across two different domains would silently break sessions unless that's changed too.

**Free-tier deployment (Render + Neon)** — a `render.yaml` Blueprint at the repo root defines the service:

1. Create a free [Neon](https://neon.tech) Postgres project and grab its connection string (includes `?sslmode=require`).
2. Run `npm run setup` once against it to create the schema and seed the demo org — from `server/`, with `DATABASE_URL` temporarily pointed at Neon instead of local Postgres (e.g. in PowerShell: `$env:DATABASE_URL="<neon-connection-string>"; npm run setup`).
3. Generate a real `JWT_SECRET`: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
4. On [Render](https://render.com): "New +" → "Blueprint" → connect this repo. Render reads `render.yaml` and prompts for the `sync: false` values: `DATABASE_URL` (step 1), `JWT_SECRET` (step 3), and `SMTP_USER`/`SMTP_PASS`/`MAIL_FROM` (reuse the values from your local `server/.env`). Put in placeholders for `CLIENT_ORIGIN`/`APP_URL` for now.
5. After the first deploy, note the assigned `https://*.onrender.com` URL, then set `CLIENT_ORIGIN` and `APP_URL` to that exact URL in the service's Environment settings (triggers a redeploy).

Render's free tier spins down after ~15 minutes idle and cold-starts (~30–50s) on the next request — fine for a demo, worth knowing if you're the one testing it.

**Deploying elsewhere instead**: `npm start` runs the API (not `npm run dev` — no need for `--watch`, and it avoids the brief request-reset window a hot-reloading dev server can hit mid-restart); `npm run build` in `client/` produces `client/dist/` for the server to pick up automatically; set `COOKIE_SECURE=true` once served over HTTPS and point `JWT_SECRET`/`DATABASE_URL`/`CLIENT_ORIGIN`/`APP_URL` at your real values.

## License

Proprietary — built for a specific client engagement. Not currently licensed for reuse.
