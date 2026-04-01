#!/bin/bash
# NU-AURA Frontend Dev Server
# Kills any existing process on port 3000, clears Next.js cache, and starts fresh.

PORT=3000

echo "🔍 Checking for existing process on port $PORT..."
PID=$(lsof -ti:$PORT 2>/dev/null)

if [ -n "$PID" ]; then
  echo "⚠️  Found process $PID on port $PORT — killing it..."
  kill -9 $PID 2>/dev/null
  sleep 1
  echo "✅ Process killed."
else
  echo "✅ Port $PORT is free."
fi

echo "🧹 Clearing Next.js cache..."
rm -rf .next/cache
echo "✅ Cache cleared."

echo "🚀 Starting Next.js dev server..."
npm run dev
