#!/bin/bash

# NU-AURA Backend — Local Development Startup Script
# SETUP: Copy .env.example to .env in the project root and fill in all required values.
# This script reads credentials from environment variables. Never hardcode secrets here.

set -euo pipefail

# Load .env file if it exists (project root or backend directory)
if [ -f "../.env" ]; then
  set -a; source "../.env"; set +a
elif [ -f ".env" ]; then
  set -a; source ".env"; set +a
fi

# Validate required environment variables
: "${JWT_SECRET:?ERROR: JWT_SECRET is not set. Copy .env.example to .env and fill in values.}"
: "${SPRING_DATASOURCE_URL:?ERROR: SPRING_DATASOURCE_URL is not set.}"
: "${SPRING_DATASOURCE_USERNAME:?ERROR: SPRING_DATASOURCE_USERNAME is not set.}"
: "${SPRING_DATASOURCE_PASSWORD:?ERROR: SPRING_DATASOURCE_PASSWORD is not set.}"
: "${APP_SECURITY_ENCRYPTION_KEY:?ERROR: APP_SECURITY_ENCRYPTION_KEY is not set.}"

export JWT_SECRET
export SPRING_DATASOURCE_URL
export SPRING_DATASOURCE_USERNAME
export SPRING_DATASOURCE_PASSWORD
export SPRING_PROFILES_ACTIVE="${SPRING_PROFILES_ACTIVE:-dev}"
# Flyway uses direct (non-pooler) endpoint for migrations
export SPRING_FLYWAY_URL="${SPRING_FLYWAY_URL:-${SPRING_DATASOURCE_URL}}"
export SPRING_FLYWAY_USER="${SPRING_FLYWAY_USER:-${SPRING_DATASOURCE_USERNAME}}"
export SPRING_FLYWAY_PASSWORD="${SPRING_FLYWAY_PASSWORD:-${SPRING_DATASOURCE_PASSWORD}}"
export SPRING_REDIS_HOST="${SPRING_REDIS_HOST:-localhost}"
export SPRING_REDIS_PORT="${SPRING_REDIS_PORT:-6379}"
export FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
# Local development: disable secure cookies (HTTP) and CSRF (for testing)
export COOKIE_SECURE="${COOKIE_SECURE:-false}"
export CSRF_ENABLED="${CSRF_ENABLED:-false}"
# CORS allowed origins
export APP_CORS_ALLOWED_ORIGINS="${APP_CORS_ALLOWED_ORIGINS:-http://localhost:3000,http://localhost:3001,http://localhost:8080}"
# Encryption key for sensitive data (32 bytes)
export APP_SECURITY_ENCRYPTION_KEY
# AI / LLM Configuration (optional)
export OPENAI_API_KEY="${OPENAI_API_KEY:-}"
export OPENAI_BASE_URL="${OPENAI_BASE_URL:-https://api.groq.com/openai/v1}"
export OPENAI_MODEL="${OPENAI_MODEL:-llama-3.1-8b-instant}"

echo "Checking for existing processes on port 8080..."
# Kill any process running on port 8080
PORT_PID=$(lsof -ti:8080 || true)
if [ -n "$PORT_PID" ]; then
  echo "Found process $PORT_PID on port 8080. Killing it..."
  kill -9 $PORT_PID
  sleep 2
  echo "Process killed."
else
  echo "No process found on port 8080."
fi

echo ""
echo "Starting HRMS Backend..."
echo "Profile: $SPRING_PROFILES_ACTIVE"
echo "Database: $SPRING_DATASOURCE_URL"
echo ""

JAR_FILE="target/hrms-backend-1.0.0.jar"

# Build only if JAR doesn't exist
if [ ! -f "$JAR_FILE" ]; then
  echo "JAR not found — building..."
  mvn clean package -DskipTests -q
fi

# JVM flags tuned for low-memory local dev (macOS OOM-kill prevention):
#   -Xmx768m                      → heap cap (leaves room for metaspace+stacks+native)
#   -Xms128m                      → start small, grow on demand
#   -XX:MaxMetaspaceSize=192m      → cap class metadata (default is unlimited)
#   -XX:ReservedCodeCacheSize=64m  → cap JIT code cache (default 240m, unused at TieredStopAtLevel=1)
#   -Xss512k                       → reduce per-thread stack (default 1m × many threads)
#   -XX:TieredStopAtLevel=1        → C1 JIT only, skip C2 compilation
#   -XX:+UseSerialGC               → lowest GC overhead for single-machine dev
#   -Dspring.jmx.enabled=false     → skip JMX bean registration
java \
  -Xmx640m \
  -Xms128m \
  -XX:MaxMetaspaceSize=160m \
  -XX:ReservedCodeCacheSize=48m \
  -Xss256k \
  -XX:TieredStopAtLevel=1 \
  -XX:+UseG1GC \
  -XX:G1PeriodicGCInterval=30000 \
  -XX:MinHeapFreeRatio=10 \
  -XX:MaxHeapFreeRatio=20 \
  -XX:+UseStringDeduplication \
  -Dspring.jmx.enabled=false \
  -Dspring.devtools.restart.enabled=false \
  -jar "$JAR_FILE"
