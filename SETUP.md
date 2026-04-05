# NU-AURA Setup Guide

## Prerequisites

| Software       | Version | Purpose                       |
|----------------|---------|-------------------------------|
| Java           | 21+     | Backend runtime               |
| Maven          | 3.8+    | Backend build tool            |
| Node.js        | 18+     | Frontend runtime              |
| npm            | 9+      | Frontend package manager      |
| Docker         | 20+     | Container runtime             |
| Docker Compose | 2.0+    | Multi-container orchestration |
| Git            | 2.30+   | Version control               |

> PostgreSQL is hosted on **Neon cloud** for development. There is no local PostgreSQL in Docker
> Compose.

---

## 1. Clone Repository

```bash
git clone https://github.com/Fayaz-Deen/nu-aura.git
cd nu-aura
```

## 2. Environment Variables

Copy the example env file and fill in your credentials:

```bash
cp .env.example .env
```

### Required Variables

**Database (Neon cloud):**

```
NEON_JDBC_URL=jdbc:postgresql://<host>/<db>?sslmode=require
NEON_DB_USERNAME=<username>
NEON_DB_PASSWORD=<password>
```

**Security:**

```
JWT_SECRET=<64+ character random string>
APP_SECURITY_ENCRYPTION_KEY=<AES-256 key>
```

**Frontend** (create `frontend/.env.local`):

```
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<google-oauth-client-id>
```

See `.env.example` for the full list of available variables.

## 3. Start Infrastructure

```bash
docker-compose up -d
```

This starts 6 services:

- **Redis** (6379) — cache, rate limiting, sessions
- **Zookeeper** (2181) — Kafka dependency
- **Kafka** (9092) — event streaming
- **Elasticsearch** (9200) — full-text search
- **MinIO** (9000/9001) — file storage
- **Prometheus** (9090) — metrics

## 4. Start Backend

```bash
cd backend
./start-backend.sh
```

The backend runs on `http://localhost:8080`. Flyway will automatically apply pending migrations on
startup.

**Verify:** `curl http://localhost:8080/actuator/health`

## 5. Start Frontend

```bash
cd frontend
npm install    # first time only
npm run dev
```

The frontend runs on `http://localhost:3000`.

**Verify:** Open `http://localhost:3000/auth/login` in your browser.

## 6. Verify Setup

| Check          | Command/URL                                                                             |
|----------------|-----------------------------------------------------------------------------------------|
| Backend health | `curl http://localhost:8080/actuator/health`                                            |
| Frontend loads | `http://localhost:3000`                                                                 |
| API docs       | `http://localhost:8080/swagger-ui.html`                                                 |
| Redis          | `docker exec -it nu-aura-redis-1 redis-cli ping`                                        |
| Kafka          | `docker exec -it nu-aura-kafka-1 kafka-topics --list --bootstrap-server localhost:9092` |
| MinIO          | `http://localhost:9001` (minioadmin/minioadmin)                                         |

### Default Login Credentials

After seed data (V19 migration) is applied, SuperAdmin accounts are available. Check the seed
migration for credentials or create accounts via the signup flow.

Demo data (V30 migration) adds sample employees for development — passwords use placeholder hashes
and may need updating.

---

## Quick Reference

```bash
# Start everything
./start-dev.sh

# Stop everything
./stop-dev.sh

# Run backend tests
cd backend && ./mvnw test

# Run frontend lint + typecheck
cd frontend && npm run lint && npx tsc --noEmit
```

## Troubleshooting

| Problem                  | Solution                                                               |
|--------------------------|------------------------------------------------------------------------|
| Backend won't start      | Check `.env` has correct Neon DB credentials                           |
| Port 8080 in use         | `lsof -i :8080` and kill the process                                   |
| Port 3000 in use         | `lsof -i :3000` and kill the process                                   |
| Flyway migration error   | Check `backend/src/main/resources/db/migration/` for conflicts         |
| Redis connection refused | `docker-compose up -d redis`                                           |
| Kafka not connecting     | Ensure Zookeeper started first: `docker-compose up -d zookeeper kafka` |
| Frontend build errors    | Delete `frontend/.next/` and `node_modules/`, then `npm install`       |
| CORS errors              | Verify `NEXT_PUBLIC_API_URL` matches the backend URL                   |
