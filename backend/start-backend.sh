#!/bin/bash

# Start Backend with all required environment variables
export JWT_SECRET="EIpKw+jjwEbzx1iJ9twBAlSrBDwbQxIePd9eFGFIopMWMVfSMXA/mPfYBnuyzJfMOFcFElTghR27sQ0mslFdNA=="
export SPRING_PROFILES_ACTIVE=dev
export SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/hrms_dev
export SPRING_DATASOURCE_USERNAME=hrms
export SPRING_DATASOURCE_PASSWORD=hrms_dev_password
export SPRING_REDIS_HOST=localhost
export SPRING_REDIS_PORT=6379
export FRONTEND_URL=http://localhost:3000
# Local development: disable secure cookies (HTTP) and CSRF (for testing)
export COOKIE_SECURE=false
export CSRF_ENABLED=false
# CORS allowed origins
export APP_CORS_ALLOWED_ORIGINS="http://localhost:3000,http://localhost:3001,http://localhost:8080"
# Encryption key for sensitive data (32 bytes)
export APP_SECURITY_ENCRYPTION_KEY="0123456789ABCDEF0123456789ABCDEF"
# AI / LLM Configuration (Groq free tier)
export OPENAI_API_KEY="${OPENAI_API_KEY:-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}"
export OPENAI_BASE_URL="${OPENAI_BASE_URL:-https://api.groq.com/openai/v1}"
export OPENAI_MODEL="${OPENAI_MODEL:-llama-3.1-8b-instant}"

echo "Checking for existing processes on port 8080..."
# Kill any process running on port 8080
PORT_PID=$(lsof -ti:8080)
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

mvn spring-boot:run -Dmaven.test.skip=true
