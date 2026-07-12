# AssetFlow — Enterprise Asset & Resource Management ERP

AssetFlow is a backend-only, enterprise-grade Asset & Resource Management ERP built with **Node.js, TypeScript, Express and MongoDB (Mongoose)**. It covers the full asset lifecycle — procurement/registration, allocation, transfer, return, booking, maintenance, physical audits, dashboards, reporting — plus a unified **Notification**, **Activity Log** and **Audit Trail** subsystem, all behind a granular RBAC model.

> This repository is the API backend. A frontend (React/Next) or mobile client can be wired to the REST API served under `/api/v1`.

## Features

- **Authentication & RBAC** — JWT access/refresh cookies, refresh-token rotation & revocation, 4 roles (Admin, Asset Manager, Department Head, Employee) with ~60 fine-grained permissions.
- **Organization** — Departments (hierarchical) and Asset Categories with custom fields; Employees.
- **Assets** — Registration with tags, depreciation (current value), documents, location, condition/status lifecycle, history.
- **Allocation / Transfer / Return** — assign assets to employees, move between departments, return flow with manager approval.
- **Booking** — reserve assets for a time window with conflict checks and reminders.
- **Maintenance** — request → approve → assign technician → in-progress → resolve, with cost tracking.
- **Audits** — schedule department/location audits, assign auditors, record items, discrepancies, findings, and close-out.
- **Notifications** — template-driven, channel-aware (in-app/email/push/SMS/Screen), per-user preferences, auto-derived from business events.
- **Activity Log & Audit Trail** — every mutating action is recorded; sensitive actions additionally produce an immutable audit-trail entry.
- **Dashboard & Reports** — KPI summaries and exportable reports.

## Tech Stack

| Concern        | Choice |
| -------------- | ------ |
| Runtime        | Node.js 20 |
| Language       | TypeScript 5 |
| Framework      | Express 4 |
| Database       | MongoDB + Mongoose 8 |
| Auth           | jsonwebtoken, bcryptjs, cookie-parser |
| Validation     | Zod (routes) + Joi (services) |
| Docs           | Swagger UI (`/api-docs`) |
| Logging        | Winston + Morgan |
| Security       | Helmet, CORS, express-rate-limit, body sanitization |
| Testing        | Jest + ts-jest + Supertest + MongoMemoryServer |

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env        # edit secrets, Mongo URI, CORS origin

# 3. Run (development, auto-reload)
npm run dev

# 4. Seed reference + sample data (optional, also runs on server start)
npm run seed
```

The API is served at `http://localhost:5000/api/v1`. Swagger docs at `http://localhost:5000/api-docs`. Health check at `/api/v1/health`.

On first boot the server automatically seeds: default roles & permissions, a `General` department, the initial admin user (from `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD`), and reference/sample data (departments, categories, employees, assets, a booking, a maintenance request, an audit).

### Default admin

| Env                          | Default |
| ---------------------------- | ------- |
| `INITIAL_ADMIN_EMAIL`        | `admin@assetflow.io` |
| `INITIAL_ADMIN_PASSWORD`     | `Admin@123456` |

> Change these before any non-local deployment.

## Scripts

| Script            | Purpose |
| ----------------- | ------- |
| `npm run dev`     | Run with hot reload (ts-node-dev). |
| `npm run build`   | Compile TypeScript to `dist/`. |
| `npm start`       | Run compiled `dist/server.js`. |
| `npm run seed`    | Standalone seed of reference + sample data. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run lint`    | ESLint over `*.ts`. |
| `npm run format`  | Prettier write. |
| `npm test`        | Jest integration/unit tests. |

## Project Structure

```
src/
  app.ts                 # Express wiring (security, logging, routes, errors)
  server.ts              # Bootstrap: env validation, DB, seeds, listen
  config/                # env, env.validation
  database/              # Mongoose connection
  common/                # errors, response helpers, middleware
  middleware/            # auth, rbac, rate-limit, request-logger, sanitize, error-handler
  shared/                # events (recordActivity/dispatchNotification/recordAuditTrail), realtime, scope
  routes/                # top-level router
  modules/
    auth/ organization/ rbac/ asset/ allocation/ transfer/ return/
    booking/ maintenance/ audit/ notification/ activity-log/ audit-trail/
    dashboard/ reports/ settings/
  utils/                 # logger, pagination, helpers
  seed/                  # production seed runner
```

See [`docs/architecture.md`](docs/architecture.md), [`docs/rbac-matrix.md`](docs/rbac-matrix.md), [`docs/deployment.md`](docs/deployment.md) and [`docs/api.md`](docs/api.md).

## License

MIT
