# Deployment

AssetFlow ships with container support and is stateless apart from MongoDB, so it scales
horizontally behind a load balancer.

## Environment Variables

| Variable | Required | Default | Notes |
| -------- | -------- | ------- | ----- |
| `NODE_ENV` | yes | `development` | Set `production` for hardened config. |
| `PORT` | no | `5000` | Listen port. |
| `API_PREFIX` / `API_VERSION` | no | `/api` / `v1` | Route base path. |
| `MONGODB_URI` | yes | `mongodb://localhost:27017/assetflow` | Use a replica set in production. |
| `JWT_ACCESS_SECRET` | yes | — | Strong, unique; rotate periodically. |
| `JWT_REFRESH_SECRET` | yes | — | Different from access secret. |
| `JWT_ACCESS_EXPIRES_IN` | no | `15m` | Access token TTL. |
| `JWT_REFRESH_EXPIRES_IN` | no | `7d` | Refresh token TTL. |
| `CORS_ORIGIN` | no | `http://localhost:3000` | Comma-separated allowed origins. |
| `SECURE_COOKIE` | no | `false` | Set `true` over HTTPS. |
| `COOKIE_DOMAIN` | no | `localhost` | Cookie domain. |
| `RATE_LIMIT_WINDOW_MS` | no | `900000` | Rate-limit window. |
| `RATE_LIMIT_MAX` | no | `1000` | Max requests per window. |
| `LOG_LEVEL` | no | `info` | `fatal|error|warn|info|debug`. |
| `INITIAL_ADMIN_EMAIL` | no | `admin@assetflow.io` | Seed admin email. |
| `INITIAL_ADMIN_PASSWORD` | no | `Admin@123456` | Seed admin password (change!). |
| `SIGNUP_AUTO_ACTIVATE` | no | `true` | Auto-activate self-signups. |

`validateEnv()` refuses to start in production if `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET`
are placeholders or `SECURE_COOKIE` is off.

## Docker (recommended)

```bash
# Build & run API + Mongo
docker compose up -d --build

# API:        http://localhost:5000/api/v1
# Swagger:    http://localhost:5000/api-docs
# Mongo:      localhost:27017
```

- `Dockerfile` is multi-stage (build → production) on `node:20-alpine` with a container
  healthcheck hitting `/api/v1/health`.
- `docker-compose.yml` starts MongoDB 7 (with healthcheck) and the backend, wiring env,
  volumes (`mongo-data`, `uploads-data`, `logs-data`) and the seed-on-boot behavior.
- Provide real secrets via environment or a `.env` file mounted into the container.

### Standalone image

```bash
docker build -t assetflow-backend .
docker run -d -p 5000:5000 \
  -e NODE_ENV=production \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/assetflow \
  -e JWT_ACCESS_SECRET=*** -e JWT_REFRESH_SECRET=*** \
  assetflow-backend
```

## Reverse Proxy (production)

Terminate TLS at nginx/Caddy/ALB and forward to the API. Example nginx essentials:

```
location /api/ {
  proxy_pass http://assetflow:5000;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_set_header Cookie $http_cookie;
}
```

Enable `SECURE_COOKIE=true` and `CORS_ORIGIN` to your frontend domain.

## Scaling & State

- The API is stateless; run multiple replicas behind a load balancer.
- Refresh tokens are stored in MongoDB (`RefreshToken` collection) and support rotation +
  revocation, so no sticky sessions are required.
- For realtime push, register a `RealtimeTransport` (Socket.IO/SSE) — not required for core REST.

## Backups

- `mongodump` the `assetflow` database (schedule off-peak).
- Persist `uploads/` (asset images/documents) and `logs/` on durable volumes.
- Rotate `error.log` / `combined.log` / HTTP access log via logrotate or the container's
  log driver.

## Monitoring

- Health: `GET /api/v1/health` → `{ success: true, message: "AssetFlow API healthy" }`.
- Logs: Winston (`error.log`, `combined.log`) + Morgan HTTP access log; ship to your SIEM.
- Metrics: add Prometheus/`/metrics` exporter if required (out of scope here).

## CI/CD

- `npm run typecheck` and `npm run lint` gate merges.
- `npm test` runs Jest (MongoMemoryServer-backed) — run in CI before deploy.
- `npm run build` produces `dist/` consumed by the Docker production stage.
- Husky + lint-staged enforce formatting/checks on commit (see `.husky/pre-commit`).
