#!/bin/bash

# NU-AURA HRMS Development Environment Startup Script
# This script starts backend and frontend in separate terminal windows

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🚀 NU-AURA HRMS Development Environment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if Docker services are running
echo "📦 Checking Docker services..."
if ! docker ps | grep -q "hrms-postgres"; then
    echo "⚠️  PostgreSQL not running. Starting Docker services..."
    cd "$PROJECT_ROOT"
    docker-compose up -d postgres redis kafka zookeeper
    echo "⏳ Waiting 10 seconds for services to initialize..."
    sleep 10
else
    echo "✅ Docker services are running"
fi

echo ""
echo "🔧 Starting Backend and Frontend..."
echo ""

# Start Backend in new terminal
osascript <<EOF
tell application "Terminal"
    do script "cd '$PROJECT_ROOT/backend' && clear && echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' && echo '  🔵 BACKEND SERVER (Port 8080)' && echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' && echo '' && ./start-backend.sh"
    activate
end tell
EOF

# Wait a moment for backend terminal to open
sleep 2

# Start Frontend in new terminal
osascript <<EOF
tell application "Terminal"
    do script "cd '$PROJECT_ROOT/frontend' && clear && echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' && echo '  🟢 FRONTEND SERVER (Port 3000)' && echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' && echo '' && npm run dev"
    activate
end tell
EOF

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ Development Environment Starting"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📍 Service URLs:"
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:8080"
echo "   Health:    http://localhost:8080/actuator/health"
echo ""
echo "🔍 Infrastructure:"
echo "   PostgreSQL: localhost:5432"
echo "   Redis:      localhost:6379"
echo "   Kafka:      localhost:9092"
echo ""
echo "💡 Tips:"
echo "   • Backend will take ~30-60 seconds to start"
echo "   • Frontend will be ready in ~10-20 seconds"
echo "   • Check terminal windows for startup logs"
echo "   • Press Ctrl+C in each terminal to stop services"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
