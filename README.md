# Referral and Video Earnings Platform

## Docker

### Prerequisites

- Docker Engine with Docker Compose v2.
- One available host port for Nginx (8080 by default).

The Docker layout is:

```text
frontend/   builds the React bundle and serves static assets
nginx/      standalone edge proxy for the frontend and /api/
backend/    Java 21 Spring Boot application
mysql/      official MySQL 8.4 image with a named persistent volume
```

Create local configuration without committing secrets:

```bash
cp .env.example .env
openssl rand -base64 64   # use the result for JWT_SECRET
```

Replace the database passwords and `JWT_SECRET` in `.env`. Compose also accepts
the existing `backend/.env`; when both files exist, `backend/.env` takes
precedence. Keep PayHero disabled for local testing unless real credentials and
a publicly reachable HTTPS callback URL are available. The application uses
the existing `dev` profile only when explicitly selected; its seed credentials
are not enabled by the default Docker profile.

Build and start all services:

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f
```

The application is available at <http://localhost:8080> (or the configured
`FRONTEND_PORT`). Only Nginx is published to the host. Spring Boot listens on
the private Compose network as `backend:8000`, and MySQL listens only as
`mysql:3306`; neither is directly published.

The `frontend` image runs the existing `npm ci && npm run build` workflow and
serves the generated production assets. The standalone `proxy` service serves
that bundle, falls back to `index.html` for client-side routes, and proxies
same-origin `/api/` requests to `http://backend:8000` without changing the
path. The browser never needs to resolve the internal `backend` hostname.
Hashed assets are cacheable for one year; `index.html` and all API responses
are not cached.

Validate the effective configuration and Nginx itself:

```bash
docker compose config
docker compose exec proxy nginx -t
docker compose ps
```

Useful operations:

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f mysql
docker compose logs -f proxy
docker compose restart
docker compose down
docker compose up -d --build
```

`docker compose down` preserves the named MySQL volume by default.
`docker compose down -v` removes it and can destroy stored database data, so
do not use it for routine troubleshooting.

Back up the configured database before destructive maintenance:

```bash
docker compose exec -T mysql sh -c \
  'exec mysqldump -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' \
  > referralhub-backup.sql
```

For startup failures, check `docker compose ps`, then inspect the MySQL,
backend, and Nginx logs. The backend waits for an authenticated MySQL health
check and runs Flyway migrations before Nginx starts. If the backend build
fails, run `cd backend && ./mvnw test`; if the frontend build fails, run
`cd frontend && npm ci && npm run build`. A real PayHero callback remains a
manual integration test requiring PayHero credentials and a public HTTPS
endpoint; no tunnel service is included in Compose.

When a tunnel is added manually, point it at the published Nginx entry point
(`http://127.0.0.1:${FRONTEND_PORT}`), not at Spring Boot or MySQL. Configure
`PAYHERO_CALLBACK_URL` with the eventual public HTTPS callback URL. TLS is not
configured inside this local HTTP Nginx image; add certificates and an
explicit TLS strategy before enabling HTTPS or HSTS.
