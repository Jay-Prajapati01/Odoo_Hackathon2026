# API Reference

Base path: `/api/v1`. All requests (except auth) require a valid session cookie issued
by `POST /api/v1/auth/login`. Authorization is enforced per-route via RBAC — see
[`rbac-matrix.md`](rbac-matrix.md).

> **Source of truth:** interactive OpenAPI docs are served at `/api-docs` (Swagger UI).
> Every route is annotated there with request/response schemas. This document lists the
> mounted surfaces and the most important operations per module.

## Conventions

- All timestamps are ISO-8601. All ids are MongoDB ObjectIds (strings).
- Standard envelope: `{ success, message, data, errors, meta, timestamp }`.
- Pagination query: `?page=1&limit=20&search=&sort=`. `meta` returns page totals.
- Errors use HTTP status + `{ success:false, message, errors }`.

## Auth & Identity

| Method | Path | Auth | Description |
| ------ | ---- | ---- | ----------- |
| POST | `/auth/login` | — | Email + password → sets cookies, returns tokens. |
| POST | `/auth/refresh` | refresh cookie | Rotate access token. |
| POST | `/auth/logout` | refresh cookie | Revoke current refresh token. |
| POST | `/auth/logout-all` | auth | Revoke all sessions for the user. |
| GET | `/auth/me` | auth | Current user + roles/permissions. |
| POST | `/auth/signup` | —/open | Self-registration (auto-activate configurable). |
| POST | `/roles` | `user.promote` | Create/assign roles. |

## Modules (base paths)

| Base Path | Module | Key Operations |
| --------- | ------ | -------------- |
| `/departments` | Organization | CRUD departments (hierarchical), list, search. |
| `/employees` | Organization | CRUD employees, profile, department assignment. |
| `/asset-categories` | Organization | CRUD asset categories + custom fields. |
| `/assets` | Asset | Register, update, retire/dispose, allocate, transfer, history, search, depreciation. |
| `/allocations` | Allocation | Allocate asset to employee, history. |
| `/transfers` | Transfer | Request transfer, approve/reject, move departments. |
| `/returns` | Return | Return asset, manager approval. |
| `/bookings` | Booking | Create booking (conflict-checked), list, update, cancel, approve, reminders. |
| `/maintenance` | Maintenance | Request, approve, assign technician, start, resolve, cost tracking. |
| `/audits` | Audit | Schedule, scope, assign auditors, items, discrepancies, complete. |
| `/notifications` | Notification | List, mark read, preferences. |
| `/activity-logs` | Activity Log | Immutable activity feed (read/filter). |
| `/audit-trail` | Audit Trail | Immutable security/compliance trail (read/filter). |
| `/dashboard` | Dashboard | KPI summary, utilization, status breakdown. |
| `/reports` | Reports | Asset/booking/maintenance/audit reports, export (CSV/PDF). |
| `/settings` | Settings | System settings (read/manage). |

## Workflow Examples

- **Allocate an asset** → `POST /assets/:id/allocate` (`asset.allocate`).
- **Request transfer** → `POST /transfers` (`asset.transfer`) → manager `approve`.
- **Book an asset** → `POST /bookings` (`booking.create`); blocked if asset is
  `retired|disposed|lost|maintenance`.
- **Report an issue** → `POST /maintenance` (`maintenance` create) → `approve` →
  `assign` → `complete`.
- **Run an audit** → `POST /audits` → `assign` auditors → record `auditItem`s &
  `auditDiscrepancy` → `complete`.

## Notifications

Calling `dispatchNotification` (or any `recordActivity`) can fan out to the recipient's
preferred channels (in-app, email, push, SMS, Screen) based on
`GET /notifications/preferences`. In-app notifications are listed at `GET /notifications`
and marked read via `PATCH /notifications/:id/read`.

## Health

- `GET /health` → `{ success: true, message: "AssetFlow API healthy" }` (no auth).
