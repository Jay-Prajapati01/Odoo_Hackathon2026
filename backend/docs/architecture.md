# Architecture

AssetFlow follows a layered, module-per-domain architecture. Each module owns its
models, repositories, services, controllers, validators, DTOs, interfaces and types,
keeping cross-module coupling to a minimum.

## Layers

```
Route (Zod validation)
  └─ Controller (thin: parse + authorize + delegate)
       └─ Service (business rules, RBAC scope, side-effects via events)
            └─ Repository (Mongoose persistence)
                 └─ Model (schema, indexes, lifecycle hooks)
```

- **Routes** validate input with Zod and mount controllers under `/api/v1/<module>`.
- **Controllers** are intentionally thin: authenticate, enforce RBAC, call the service, and shape the standardized response.
- **Services** contain all business logic, apply the caller's data scope, and emit side-effects through `shared/events.ts`.
- **Repositories** encapsulate Mongoose queries and are the only layer that touches the database directly.
- **Models** define the schema, indexes, aliases, and `pre('validate')` defaults (e.g. asset `currentValue` defaults to `purchaseCost`).

## Standard API Response

Every response uses:

```json
{ "success": true, "message": "OK", "data": {}, "errors": null, "meta": {}, "timestamp": "2026-..." }
```

Paginated lists include `meta`: `{ page, limit, total, totalPages, hasNext, hasPrev }`.

## Cross-Cutting Concerns

- **Side-effects via events** — `shared/events.ts` exposes:
  - `recordActivity({ userId, action, entity, entityId, old/newValue, module, description, req })` → writes an **Activity Log** and auto-derives an **Audit Trail** entry when the action is security-relevant (create/update/delete/approve/reject/login/logout/password_change/export/download/assign/status_change).
  - `dispatchNotification({ recipientId, type, title, message, module, entityType, entityId, channels, priority, actionUrl, ... })` → resolves the recipient's channel preferences (in-app/email/push/SMS/Screen) and persists a **Notification**.
  - `recordAuditTrail(...)` → explicit immutable audit entry.
- **Realtime** — `shared/realtime.ts` defines a pluggable `RealtimeTransport`. A no-op transport ships by default; Socket.IO/SSE/Push adapters can be registered without touching call sites.
- **Data scoping** — `shared/scope.ts` `buildScope(req)` derives the caller's department/role context so services filter by Admin (all), Department Head (department), or Employee (own records).
- **Observability** — Winston writes `error.log` + `combined.log` + console; Morgan logs HTTP requests (file in production) with a trace id (`attachTraceId`).

## Security Model

| Control | Implementation |
| ------- | -------------- |
| Transport hardening | `helmet()` |
| CORS | configured origin + credentials |
| Rate limiting | global + stricter auth limiter (`express-rate-limit`) |
| Auth | httpOnly, secure (prod), sameSite cookies; JWT access + refresh |
| Token rotation | refresh revokes previous `jti`; `revokeAllForUser` on logout |
| Passwords | bcryptjs |
| Input safety | Zod route validation + body sanitization (NoSQL/prototype-pollution) |
| Authorization | RBAC middleware keyed on `PERMISSIONS` |
| Config safety | `validateEnv()` fails fast in production on weak/insecure config |

## Data Model Highlights

- **Asset** — `assetTag` (unique), `category`, `status` (`available|allocated|reserved|maintenance|lost|retired|disposed`), `condition`, `purchaseCost`, `currentValue`, `documents`, `specifications`, `assignedTo`. Text index for search. `assetHistory` tracks changes.
- **Booking** — conflicts against `BLOCKED_ASSET_STATUSES` (`retired|disposed|lost|maintenance`); denormalizes `assetName/assetTag/employeeName/departmentName` for fast listing.
- **Maintenance** — lifecycle `pending → approved → technician_assigned → in_progress → resolved` (or `rejected`/`cancelled`) with cost tracking.
- **Audit** — `scope` (`department|location|organization`), `status` (`draft|scheduled|active|completed|cancelled`); `auditItem`, `auditAssignment`, `auditDiscrepancy`, `auditHistory` support the workflow.
- **Notification / ActivityLog / AuditTrail** — the three-way observability subsystem described above.

## Sequence: "allocate an asset"

1. `POST /api/v1/assets/:id/allocate` → Zod validates.
2. Controller authorizes `asset.allocate`.
3. AssetService updates status, writes `assetHistory`, calls `recordActivity({ action: 'asset.allocated', ... })`.
4. `recordActivity` inserts an **ActivityLog** row and, because the action maps to a mutating operation, an **AuditTrail** row; it also triggers `dispatchNotification` to the assignee and the department head.
5. Standard response returned; Swagger/Postman can verify.

See [`docs/api.md`](api.md) for the full endpoint map and [`docs/rbac-matrix.md`](rbac-matrix.md) for authorization.
