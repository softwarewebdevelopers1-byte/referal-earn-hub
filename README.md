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

Create the single local configuration file without committing secrets:

```bash
cp backend/.env.example backend/.env
openssl rand -base64 64   # use the result for JWT_SECRET
```

Replace the database passwords, `JWT_SECRET`, and first-run admin credentials
in `backend/.env`. This file is the source of truth for Docker Compose and for
the backend's admin seeder. Keep PayHero disabled for local testing unless real
credentials and a publicly reachable HTTPS callback URL are available. The
application uses the existing `dev` profile only when explicitly selected; its
seed credentials are not enabled by the default Docker profile.

When the `users` table is empty, startup creates one regular `ADMIN` account
from `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD`. Replace the example
values with a unique password; startup refuses the placeholder. Existing users
are never changed and repeated starts do not create another account. The seed
does not create a Super Admin and does not run on each request.

For Docker, use `backend/.env` and pass it explicitly to Compose. This is
important because Compose's service `env_file` controls container variables,
while `--env-file` also supplies interpolation such as `FRONTEND_PORT`:

```bash
docker compose --env-file backend/.env up -d --build
```

For a direct backend run, from `backend/`, export the variables first, for
example:

```bash
export INITIAL_ADMIN_EMAIL=admin@example.com
export INITIAL_ADMIN_PASSWORD='use-a-unique-local-password'
./mvnw spring-boot:run
```

Spring Boot also imports the local `backend/.env` file for direct runs. Do not
commit `backend/.env`.

Build and start all services:

```bash
docker compose --env-file backend/.env up -d --build
docker compose --env-file backend/.env ps
docker compose --env-file backend/.env logs -f
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
docker compose --env-file backend/.env config
docker compose --env-file backend/.env exec proxy nginx -t
docker compose --env-file backend/.env ps
```

Useful operations:

```bash
docker compose --env-file backend/.env ps
docker compose --env-file backend/.env logs -f backend
docker compose --env-file backend/.env logs -f mysql
docker compose --env-file backend/.env logs -f proxy
docker compose --env-file backend/.env restart
docker compose --env-file backend/.env down
docker compose --env-file backend/.env up -d --build
```

`docker compose down` preserves the named MySQL volume by default.
`docker compose down -v` removes it and can destroy stored database data, so
do not use it for routine troubleshooting.

Back up the configured database before destructive maintenance:

```bash
docker compose --env-file backend/.env exec -T mysql sh -c \
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
