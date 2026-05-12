#!/bin/bash

# NU-AURA HRMS Development Environment Stop Script
# This script stops all running services

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🛑 Stopping NU-AURA Development Environment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Stop Backend (Spring Boot)
echo "🔵 Stopping Backend Server..."
BACKEND_PID=$(lsof -ti :8080 2>/dev/null)
if [ -n "$BACKEND_PID" ]; then
    kill -9 $BACKEND_PID 2>/dev/null
    echo "   ✓ Backend stopped (PID: $BACKEND_PID)"
else
    # Try pkill as fallback
    if pkill -9 -f "java.*HrmsApplication" 2>/dev/null; then
        echo "   ✓ Backend stopped"
    else
        echo "   ℹ Backend was not running"
    fi
fi

# Stop Frontend (Next.js)
echo "🟢 Stopping Frontend Server..."
if pkill -f "next-server"; then
    echo "   ✓ Frontend stopped"
else
    echo "   ℹ Frontend was not running"
fi

# Optionally stop Docker services
read -p "
📦 Do you want to stop Docker services (PostgreSQL, Redis, Kafka)? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "   Stopping Docker services..."
    docker-compose down
    echo "   ✓ Docker services stopped"
else
    echo "   ℹ Docker services left running"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ Development Environment Stopped"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
