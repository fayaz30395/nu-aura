# Nu-Aura HRMS Platform - Setup Guide

Complete guide to set up and run the HRMS platform on a new system.

---

## Prerequisites

### Required Software

| Software | Minimum Version | Recommended | Download |
|----------|-----------------|-------------|----------|
| Java JDK | **17+** | 21 LTS | [Adoptium](https://adoptium.net/) |
| Maven | 3.8+ | 3.9+ | [Maven](https://maven.apache.org/download.cgi) |
| Node.js | **18.17+** | 20 LTS | [Node.js](https://nodejs.org/) |
| PostgreSQL | 14+ | 16 | [PostgreSQL](https://www.postgresql.org/download/) |
| Redis | 6+ | 7 | [Redis](https://redis.io/download/) |
| MinIO (optional) | Latest | Latest | [MinIO](https://min.io/download) |

> **Important:** Node.js 14.x and 16.x are **NOT supported**. Next.js 14 requires Node.js 18.17 or later.

### Verify Your Versions

```bash
# Check versions
node --version   # Must be 18.17+
java --version   # Must be 17+
mvn --version    # Must be 3.8+

# If Node.js is too old, upgrade with:
brew install node@20 && brew link --overwrite node@20  # macOS
# or use nvm: nvm install 20 && nvm use 20
```

---

## Step 1: Clone the Repository

```bash
git clone <repository-url>
cd nu-aura/platform
```

---

## Step 2: Database Setup

### Option A: Use Shared Neon Database (Recommended for Team)

A cloud PostgreSQL database is already set up with all tables created. Use these credentials:

| Parameter | Value |
|-----------|-------|
| Host | `ep-little-darkness-ad7czn2x-pooler.c-2.us-east-1.aws.neon.tech` |
| Port | `5432` |
| Database | `neondb` |
| Username | `neondb_owner` |
| Password | `npg_xwHjDEtfb4o2` |
| SSL Mode | `require` |

**Connection String:**
```
postgresql://neondb_owner:npg_xwHjDEtfb4o2@ep-little-darkness-ad7czn2x-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
```

**JDBC URL (for backend):**
```
jdbc:postgresql://ep-little-darkness-ad7czn2x-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
```

**Test connection:**
```bash
psql 'postgresql://neondb_owner:npg_xwHjDEtfb4o2@ep-little-darkness-ad7czn2x-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require' -c '\conninfo'
```

Skip to **Step 3** if using the shared database.

---

### Option B: Local PostgreSQL Setup

#### 2.1 Install PostgreSQL

**macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**
Download and install from [PostgreSQL Downloads](https://www.postgresql.org/download/windows/)

#### 2.2 Create Database and User

```bash
# Connect to PostgreSQL
psql -U postgres

# Run these SQL commands:
CREATE USER hrms_user WITH PASSWORD 'hrms_pass';
CREATE DATABASE hrms OWNER hrms_user;
GRANT ALL PRIVILEGES ON DATABASE hrms TO hrms_user;

# Exit
\q
```

> **Note:** When using local PostgreSQL, tables will be automatically created by Liquibase migrations on first backend startup.

---

## Step 3: Redis Setup

### 3.1 Install Redis

**macOS:**
```bash
brew install redis
brew services start redis
```

**Ubuntu/Debian:**
```bash
sudo apt install redis-server
sudo systemctl start redis
```

**Windows:**
Use [Memurai](https://www.memurai.com/) or WSL2 with Redis.

### 3.2 Verify Redis is Running

```bash
redis-cli ping
# Should return: PONG
```

---

## Step 4: Backend Setup

### 4.1 Navigate to Backend Directory

```bash
cd platform/hrms-backend
```

### 4.2 Build the Parent Module First

```bash
cd ..
mvn clean install -DskipTests
cd hrms-backend
```

### 4.3 Configure Environment Variables

Create a `.env` file or set environment variables:

**For Shared Neon Database (Recommended):**
```bash
# Database - Neon Cloud
export SPRING_DATASOURCE_URL="jdbc:postgresql://ep-little-darkness-ad7czn2x-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
export SPRING_DATASOURCE_USERNAME=neondb_owner
export SPRING_DATASOURCE_PASSWORD=npg_xwHjDEtfb4o2
```

**For Local PostgreSQL:**
```bash
# Database - Local
export SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/hrms
export SPRING_DATASOURCE_USERNAME=hrms_user
export SPRING_DATASOURCE_PASSWORD=hrms_pass

# Redis (defaults shown)
export SPRING_REDIS_HOST=localhost
export SPRING_REDIS_PORT=6379

# JWT Secret (change in production!)
export JWT_SECRET=your-secret-key-change-in-production-must-be-at-least-256-bits-long

# Google OAuth (optional)
export GOOGLE_CLIENT_ID=your-google-client-id
export GOOGLE_CLIENT_SECRET=your-google-client-secret

# MinIO - File Storage (optional)
export MINIO_ENDPOINT=http://localhost:9000
export MINIO_ACCESS_KEY=minioadmin
export MINIO_SECRET_KEY=minioadmin
export MINIO_BUCKET=hrms-files

# OpenAI - AI Features (optional)
export OPENAI_API_KEY=your-openai-api-key
```

### 4.4 Run the Backend

```bash
mvn spring-boot:run
```

Or build and run as JAR:

```bash
mvn clean package -DskipTests
java -jar target/hrms-backend-1.0.0.jar
```

**Backend will start on:** `http://localhost:8080`

### 4.5 Verify Backend is Running

```bash
curl http://localhost:8080/actuator/health
# Should return: {"status":"UP"}
```

---

## Step 5: Frontend Setup

### 5.1 Navigate to Frontend Directory

```bash
cd platform/hrms-frontend
```

### 5.2 Install Dependencies

```bash
npm install
```

### 5.3 Configure Environment Variables

Create `.env.local` file:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1

# Google OAuth Configuration (optional)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id

# Demo Mode
NEXT_PUBLIC_DEMO_MODE=true
```

### 5.4 Run the Frontend

```bash
npm run dev
```

**Frontend will start on:** `http://localhost:3000`

---

## Step 6: MinIO Setup (Optional - For File Storage)

### 6.1 Install MinIO

**macOS:**
```bash
brew install minio/stable/minio
```

**Linux:**
```bash
wget https://dl.min.io/server/minio/release/linux-amd64/minio
chmod +x minio
sudo mv minio /usr/local/bin/
```

### 6.2 Run MinIO

```bash
mkdir -p ~/minio-data
minio server ~/minio-data --console-address ":9001"
```

**MinIO Console:** `http://localhost:9001`
**Default credentials:** `minioadmin` / `minioadmin`

---

## Quick Start Commands

### Using Shared Neon Database (Recommended)

```bash
# Terminal 1 - Start Redis
brew services start redis  # macOS
# or: sudo systemctl start redis  # Linux

# Terminal 2 - Backend (with Neon DB)
cd platform/hrms-backend
SPRING_DATASOURCE_URL="jdbc:postgresql://ep-little-darkness-ad7czn2x-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require" \
SPRING_DATASOURCE_USERNAME=neondb_owner \
SPRING_DATASOURCE_PASSWORD=npg_xwHjDEtfb4o2 \
mvn spring-boot:run

# Terminal 3 - Frontend
cd platform/hrms-frontend
npm install  # First time only
npm run dev
```

### Using Local PostgreSQL

```bash
# Terminal 1 - PostgreSQL & Redis (if using brew)
brew services start postgresql@14
brew services start redis

# Terminal 2 - Backend
cd platform/hrms-backend
mvn spring-boot:run

# Terminal 3 - Frontend
cd platform/hrms-frontend
npm run dev
```

---

## API Documentation

Once the backend is running, access the Swagger UI:

- **Swagger UI:** `http://localhost:8080/swagger-ui.html`
- **API Docs (JSON):** `http://localhost:8080/api-docs`

---

## Default Ports

| Service | Port |
|---------|------|
| Backend API | 8080 |
| Frontend | 3000 |
| PostgreSQL | 5432 |
| Redis | 6379 |
| MinIO API | 9000 |
| MinIO Console | 9001 |

---

## Troubleshooting

### Database Connection Failed

```bash
# Check if PostgreSQL is running
pg_isready -h localhost -p 5432

# Check if database exists
psql -U hrms_user -d hrms -c "\conninfo"
```

### Redis Connection Failed

```bash
# Check if Redis is running
redis-cli ping

# Check Redis status
brew services list | grep redis  # macOS
systemctl status redis           # Linux
```

### Port Already in Use

```bash
# Find process using port
lsof -i :8080  # or :3000

# Kill the process
kill -9 <PID>
```

### Maven Build Fails

```bash
# Clean and rebuild
mvn clean install -DskipTests

# If parent module issues, build from platform root
cd platform
mvn clean install -DskipTests
```

### Frontend npm install Fails

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

## Environment-Specific Configuration

### Development (Default)
- Debug logging enabled
- SQL queries logged
- Demo mode available

### Production
Set `SPRING_PROFILES_ACTIVE=prod` for:
- Minimal logging
- Optimized performance
- Disable demo features

```bash
export SPRING_PROFILES_ACTIVE=prod
mvn spring-boot:run
```

---

## Project Structure

```
platform/
├── hrms-backend/          # Spring Boot Backend
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/     # Java source code
│   │   │   └── resources/
│   │   │       ├── application.yml
│   │   │       └── db/changelog/  # Liquibase migrations
│   │   └── test/
│   └── pom.xml
├── hrms-frontend/         # Next.js Frontend
│   ├── app/              # App router pages
│   ├── components/       # React components
│   ├── lib/              # Utilities
│   └── package.json
├── modules/              # Shared modules
└── pom.xml               # Parent POM
```

---

## Contact & Support

For issues or questions, contact the development team.