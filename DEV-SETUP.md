# NU-AURA HRMS Development Setup

Quick reference guide for starting and managing the development environment.

## 🚀 Quick Start

### Start Everything
```bash
./start-dev.sh
```

This will:
- ✅ Check and start Docker services (PostgreSQL, Redis, Kafka)
- ✅ Open **Backend** in a new terminal window (Port 8080)
- ✅ Open **Frontend** in a new terminal window (Port 3000)

### Stop Everything
```bash
./stop-dev.sh
```

This will:
- ✅ Stop Backend server
- ✅ Stop Frontend server
- ✅ Optionally stop Docker services

---

## 📍 Service URLs

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | Next.js Application |
| **Backend API** | http://localhost:8080 | Spring Boot REST API |
| **Health Check** | http://localhost:8080/actuator/health | Backend health status |
| **Swagger UI** | http://localhost:8080/swagger-ui.html | API Documentation |

---

## 🔧 Infrastructure Services

| Service | Port | Notes |
|---------|------|-------|
| PostgreSQL | 5432 | Database: `hrms_dev` |
| Redis | 6379 | Cache & Sessions |
| Kafka | 9092 | Event Streaming |
| Zookeeper | 2181 | Kafka Dependency |

---

## 📝 Manual Startup (Alternative)

If you prefer manual control:

### 1. Start Infrastructure
```bash
docker-compose up -d postgres redis kafka zookeeper
```

### 2. Start Backend
```bash
cd backend
./start-backend.sh
```

### 3. Start Frontend
```bash
cd frontend
npm run dev
```

---

## ⚙️ Configuration

### Backend Configuration
- **Profile**: `dev` (auto-selected)
- **Database**: `jdbc:postgresql://localhost:5432/hrms_dev`
- **Schema Sync**: Auto-update enabled via Hibernate
- **Logging**: INFO level (minimal verbosity)

### Frontend Configuration
- **Framework**: Next.js 14 (App Router)
- **Dev Server**: Turbopack enabled
- **Hot Reload**: Enabled

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check if port 8080 is in use
lsof -i :8080

# Check Docker services
docker-compose ps

# View backend logs
cd backend
./start-backend.sh
```

### Frontend won't start
```bash
# Check if port 3000 is in use
lsof -i :3000

# Clear Next.js cache
cd frontend
rm -rf .next
npm run dev
```

### Database connection issues
```bash
# Restart PostgreSQL
docker-compose restart postgres

# Check connection
psql -h localhost -U hrms_user -d hrms_dev
```

---

## 📦 First Time Setup

### 1. Install Dependencies
```bash
# Backend (Maven)
cd backend
mvn clean install -DskipTests

# Frontend (npm)
cd frontend
npm install
```

### 2. Set Environment Variables
```bash
# Backend: Create .env file
echo "JWT_SECRET=your-secret-key-at-least-256-bits-long" > backend/.env

# Frontend: Create .env.local file
echo "NEXT_PUBLIC_API_URL=http://localhost:8080" > frontend/.env.local
```

### 3. Start Docker Services
```bash
docker-compose up -d
```

### 4. Run the Startup Script
```bash
./start-dev.sh
```

---

## 🔑 Default Credentials

After first startup, default SuperAdmin account:
- **Email**: `admin@nuaura.com`
- **Password**: Check backend initialization logs or bootstrap script

---

## 💡 Useful Commands

### View Running Processes
```bash
# Backend
ps aux | grep HrmsApplication

# Frontend
ps aux | grep next-server

# Docker services
docker-compose ps
```

### View Logs
```bash
# Backend logs
tail -f backend/logs/application.log

# Frontend logs (shown in terminal)

# Docker logs
docker-compose logs -f postgres
docker-compose logs -f kafka
```

### Database Management
```bash
# Connect to PostgreSQL
docker exec -it hrms-postgres psql -U hrms_user -d hrms_dev

# View tables
\dt

# Quit
\q
```

---

## 🎯 Development Workflow

1. **Start Environment**: `./start-dev.sh`
2. **Make Changes**: Edit code (auto-reload enabled)
3. **Test**: Use frontend at http://localhost:3000
4. **Stop Environment**: `./stop-dev.sh`

---

## 📚 Additional Resources

- [Backend README](backend/README.md)
- [Frontend README](frontend/README.md)
- [Architecture Documentation](docs/ARCHITECTURE.md)
- [API Documentation](http://localhost:8080/swagger-ui.html)

---

**Happy Coding! 🚀**
