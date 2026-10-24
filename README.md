# Referral and Video Earnings Platform

## Docker

### Prerequisites

- Docker Engine with Docker Compose v2.
- Open ports for the configured frontend and backend host bindings (8080 and
  8000 by default).

Create local configuration without committing secrets:

```bash
cp .env.example .env
openssl rand -base64 64   # use the result for JWT_SECRET
```

Replace the database passwords and `JWT_SECRET` in `.env`. Keep PayHero
disabled for local testing unless real credentials and a publicly reachable
HTTPS callback URL are available. The application uses the existing `dev`
profile only when explicitly selected; its seed credentials are not enabled by
the default Docker profile.

Build and start all services:

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f
```

The frontend is available at <http://localhost:8080>. The backend is directly
available at <http://localhost:8000> for health checks and externally
configured callbacks. MySQL is available only to the Compose network as the
`mysql` service and is not published to the host.

The frontend bundle uses same-origin `/api/...` requests. Nginx serves the
React application, falls back to `index.html` for client-side routes, and
proxies `/api/` to `http://backend:8080` inside the Docker network. The
browser never needs to resolve the internal `backend` hostname.

Useful operations:

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f mysql
docker compose logs -f frontend
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

For startup failures, check `docker compose ps`, then inspect the MySQL logs
first, followed by the backend and frontend logs. The backend waits for an
authenticated MySQL health check, runs Flyway migrations, and exposes
`/actuator/health` on its directly published development port. If the backend
build fails, run `cd backend && ./mvnw test`; if the frontend build fails, run
`cd frontend && npm ci && npm run build`. A real PayHero callback remains a
manual integration test requiring PayHero credentials and a public HTTPS
endpoint; no tunnel service is included in Compose.
