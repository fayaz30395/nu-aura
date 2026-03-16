# NU-AURA Platform Setup Guide

Complete guide to set up the NU-AURA platform on a new system.

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Clone Repository](#clone-repository)
3. [Infrastructure Setup](#infrastructure-setup)
4. [Backend Setup](#backend-setup)
5. [Frontend Setup](#frontend-setup)
6. [Running the Application](#running-the-application)
7. [Verification](#verification)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| **Java** | 17+ | Backend runtime |
| **Maven** | 3.8+ | Backend build tool |
| **Node.js** | 18+ | Frontend runtime |
| **npm** | 9+ | Frontend package manager |
| **Docker** | 20+ | Container runtime |
| **Docker Compose** | 2.0+ | Multi-container orchestration |
| **Git** | 2.30+ | Version control |
| **PostgreSQL** | 14+ | Database (via Docker) |
| **Redis** | 7+ | Cache (via Docker) |

### Verify Installation

```bash
# Check Java version
java -version
# Should show: openjdk version "17.x" or higher

# Check Maven version
mvn -version
# Should show: Apache Maven 3.8.x or higher

# Check Node.js version
node -v
# Should show: v18.x or higher

# Check npm version
npm -v
# Should show: 9.x or higher

# Check Docker version
docker --version
# Should show: Docker version 20.x or higher

# Check Docker Compose version
docker-compose --version
# Should show: Docker Compose version 2.x or higher

# Check Git version
git --version
# Should show: git version 2.30.x or higher
```

---

## Clone Repository

```bash
# Clone the repository
git clone https://github.com/Fayaz-Deen/nu-aura.git

# Navigate to project directory
cd nu-aura

# Verify project structure
ls -la
# Should see: backend/, frontend/, docker-compose.yml, CLAUDE.md, SKILLS.md, etc.
```

---

## Infrastructure Setup

### 1. Start Infrastructure Services

The application requires PostgreSQL, Redis, Kafka, and MinIO running via Docker.

```bash
# Start all infrastructure services
docker-compose up -d

# Verify services are running
docker-compose ps

# Expected output:
# NAME                    STATUS
# nu-aura-postgres-1      Up
# nu-aura-redis-1         Up
# nu-aura-kafka-1         Up
# nu-aura-zookeeper-1     Up
# nu-aura-minio-1         Up
```

### 2. Verify Database Connection

```bash
# Connect to PostgreSQL
docker exec -it nu-aura-postgres-1 psql -U hrms -d hrms_dev

# Should see PostgreSQL prompt:
# hrms_dev=#

# Check database
\l

# Exit PostgreSQL
\q
```

### 3. Infrastructure URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| PostgreSQL | `localhost:5432` | `hrms` / `hrms_dev_password` |
| Redis | `localhost:6379` | No password |
| MinIO Console | `http://localhost:9001` | `minioadmin` / `minioadmin` |
| Kafka | `localhost:9092` | - |

---

## Backend Setup

### 1. Navigate to Backend Directory

```bash
cd backend
```

### 2. Configure Environment Variables

The `start-backend.sh` script already contains necessary environment variables:
- JWT Secret
- Database connection
- Redis connection
- CORS configuration
- AI/LLM configuration (Groq)

**No manual configuration needed** unless you want to change defaults.

### 3. Build Backend

```bash
# Clean and compile
mvn clean compile

# Expected output:
# [INFO] BUILD SUCCESS
# [INFO] Total time: ~30 seconds
```

### 4. Run Database Migrations

```bash
# Flyway migrations run automatically on startup
# Or run manually:
mvn flyway:migrate
```

### 5. Run Backend Tests (Optional)

```bash
# Run all tests
mvn test

# Run specific test
mvn test -Dtest=EmployeeServiceTest
```

---

## Frontend Setup

### 1. Navigate to Frontend Directory

```bash
cd ../frontend
```

### 2. Install Dependencies

```bash
# Install all npm packages
npm install

# This may take 2-5 minutes depending on your internet speed
```

### 3. Configure Environment Variables

Create `.env.local` file:

```bash
# Copy example environment file (if exists) or create manually
cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_APP_NAME=NU-AURA
EOF
```

### 4. Build Frontend (Optional)

```bash
# Build for production (takes ~5 minutes)
npm run build

# Expected output:
# ✓ Compiled successfully
# Route (app)                              Size     First Load JS
# ...
# ○  (Static)   prerendered as static content
```

---

## Running the Application

### Option 1: Development Mode (Recommended for Development)

#### Start Backend

```bash
# From backend directory
cd backend
./start-backend.sh

# Expected output:
# Checking for existing processes on port 8080...
# No process found on port 8080.
#
# Starting HRMS Backend...
# Profile: dev
# Database: jdbc:postgresql://localhost:5432/hrms_dev
```

**Backend will be available at:** `http://localhost:8080`

#### Start Frontend

Open a new terminal:

```bash
# From frontend directory
cd frontend
npm run dev

# Expected output:
# ▲ Next.js 14.2.35
# - Local:        http://localhost:3000
# ✓ Ready in 3.2s
```

**Frontend will be available at:** `http://localhost:3000`

### Option 2: Production Mode

#### Backend

```bash
cd backend
mvn clean package -DskipTests
java -jar target/hrms-backend-1.0.0.jar
```

#### Frontend

```bash
cd frontend
npm run build
npm run start
```

---

## Verification

### 1. Check Backend Health

```bash
# Health check endpoint
curl http://localhost:8080/actuator/health

# Expected response:
# {"status":"UP"}

# Check Swagger API docs
open http://localhost:8080/swagger-ui.html
```

### 2. Check Frontend

Open browser and navigate to:
```
http://localhost:3000
```

You should be redirected to:
```
http://localhost:3000/auth/login
```

### 3. Default Login Credentials

Check your database for seeded users, or create a new user via the signup page.

**SuperAdmin** (if seeded):
- Email: Check `users` table in database
- Password: Check database or use signup

### 4. Verify Services

| Service | URL | Expected Result |
|---------|-----|-----------------|
| Frontend | `http://localhost:3000` | Login page loads |
| Backend API | `http://localhost:8080/api/v1/health` | `{"status":"UP"}` |
| Swagger Docs | `http://localhost:8080/swagger-ui.html` | API documentation |
| MinIO Console | `http://localhost:9001` | MinIO dashboard |

---

## Troubleshooting

### Backend Issues

#### Port 8080 Already in Use

```bash
# Kill process on port 8080 (handled automatically by start-backend.sh)
lsof -ti:8080 | xargs kill -9

# Or restart backend
cd backend
./start-backend.sh
```

#### Database Connection Failed

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# If not running, start it
docker-compose up -d postgres

# Check database logs
docker-compose logs postgres
```

#### Maven Build Fails

```bash
# Clean Maven cache
mvn clean

# Update dependencies
mvn dependency:resolve

# Rebuild
mvn clean compile
```

### Frontend Issues

#### Port 3000 Already in Use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or change port in package.json
# Update dev script: "next dev -p 3001"
```

#### npm install Fails

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

#### Build Fails with "Module not found"

```bash
# Clear Next.js cache
rm -rf .next

# Rebuild
npm run build
```

#### TypeScript Errors

```bash
# Run type check
npm run typecheck

# If errors persist, check:
# 1. All imports are correct
# 2. Missing type definitions
# 3. tsconfig.json is valid
```

### Infrastructure Issues

#### Docker Services Not Starting

```bash
# Check Docker is running
docker ps

# View logs for specific service
docker-compose logs postgres
docker-compose logs redis
docker-compose logs kafka

# Restart all services
docker-compose down
docker-compose up -d
```

#### Out of Memory

```bash
# Increase Docker memory limit
# Docker Desktop > Settings > Resources > Memory
# Recommended: 4GB minimum, 8GB optimal
```

### Common Error Messages

| Error | Solution |
|-------|----------|
| `ECONNREFUSED ::1:5432` | PostgreSQL not running - `docker-compose up -d postgres` |
| `Port 8080 already in use` | Kill existing process - `lsof -ti:8080 \| xargs kill -9` |
| `Cannot find module` | Clear caches - `rm -rf .next node_modules && npm install` |
| `BUILD FAILURE` (Maven) | Check Java version - must be 17+ |
| `Module not found` (Next.js) | Clear `.next` - `rm -rf .next && npm run build` |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User Browser                            │
│                  http://localhost:3000                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  Next.js Frontend                           │
│                   (Port 3000)                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ • React Components                                    │  │
│  │ • React Query (State Management)                     │  │
│  │ • Zustand (Auth Store)                               │  │
│  │ • Mantine UI + Tailwind CSS                          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP/REST
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                Spring Boot Backend                          │
│                   (Port 8080)                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ • REST Controllers                                    │  │
│  │ • Service Layer (Business Logic)                     │  │
│  │ • JPA/Hibernate (ORM)                                │  │
│  │ • Security (JWT + RBAC)                              │  │
│  └──────────────────────────────────────────────────────┘  │
└────┬──────────────┬──────────────┬──────────────┬───────────┘
     │              │              │              │
     ▼              ▼              ▼              ▼
┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
│PostgreSQL│   │  Redis  │   │  Kafka  │   │  MinIO  │
│  :5432  │   │  :6379  │   │  :9092  │   │  :9000  │
│         │   │         │   │         │   │         │
│ Primary │   │  Cache  │   │ Events  │   │ Storage │
│   DB    │   │         │   │         │   │         │
└─────────┘   └─────────┘   └─────────┘   └─────────┘
     │              │              │              │
     └──────────────┴──────────────┴──────────────┘
                    Docker Compose
```

---

## Next Steps

After successful setup:

1. **Explore the Platform**
   - Login at `http://localhost:3000/auth/login`
   - Navigate through different modules (HRMS, Hire, Grow)

2. **Review Documentation**
   - Read `CLAUDE.md` for AI-assisted development guidelines
   - Read `SKILLS.md` for reusable patterns and best practices
   - Check API docs at `http://localhost:8080/swagger-ui.html`

3. **Development Workflow**
   - Create feature branches: `git checkout -b feature/your-feature`
   - Follow coding standards in `CLAUDE.md`
   - Run tests before committing: `npm test && mvn test`
   - Use conventional commits: `feat(module): description`

4. **Database Management**
   - Migrations are in `backend/src/main/resources/db/migration/`
   - Use Flyway versioning: `V1_XX__Description.sql`
   - Migrations run automatically on startup

5. **Deployment**
   - Build Docker images: `docker build -t nu-aura-frontend:latest ./frontend`
   - Use Kubernetes manifests (if available in `k8s/`)
   - Configure production environment variables

---

## Quick Reference Commands

```bash
# Start infrastructure
docker-compose up -d

# Start backend (from backend/)
./start-backend.sh

# Start frontend (from frontend/)
npm run dev

# Stop all services
docker-compose down

# View logs
docker-compose logs -f postgres
tail -f backend/logs/application.log

# Rebuild everything
cd backend && mvn clean install
cd ../frontend && rm -rf .next && npm run build

# Run tests
cd backend && mvn test
cd frontend && npm test

# Database access
docker exec -it nu-aura-postgres-1 psql -U hrms -d hrms_dev
```

---

## Support & Resources

- **Repository**: https://github.com/Fayaz-Deen/nu-aura
- **Documentation**: See `CLAUDE.md` and `SKILLS.md` in project root
- **API Documentation**: http://localhost:8080/swagger-ui.html (when running)
- **Issues**: Report bugs and issues on GitHub

---

*Last Updated: March 2026*
*Platform Version: 1.0.0*
