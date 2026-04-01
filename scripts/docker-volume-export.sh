#!/bin/bash

################################################################################
# NU-AURA Docker Volume Export Script
# Purpose: Export Docker volumes (fastest method for data migration)
# Usage: ./docker-volume-export.sh
################################################################################

set -e

# Configuration
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
EXPORT_DIR="./docker-exports"
EXPORT_FILE="${EXPORT_DIR}/postgres-volume-${TIMESTAMP}.tar.gz"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       NU-AURA Docker Volume Export Script                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Create export directory
mkdir -p "${EXPORT_DIR}"

# Find PostgreSQL container
POSTGRES_CONTAINER=$(docker ps --format '{{.Names}}' | grep -i postgres | head -1)

if [ -z "$POSTGRES_CONTAINER" ]; then
    echo -e "${RED}✗${NC} PostgreSQL container not running!"
    exit 1
fi

echo -e "${BLUE}[1/3]${NC} Found container: ${POSTGRES_CONTAINER}"

# Find PostgreSQL volume
POSTGRES_VOLUME=$(docker inspect "${POSTGRES_CONTAINER}" --format='{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Name}}{{end}}{{end}}')

if [ -z "$POSTGRES_VOLUME" ]; then
    echo -e "${RED}✗${NC} No named volume found for PostgreSQL data!"
    echo "Using bind mount or anonymous volume..."
    POSTGRES_VOLUME=$(docker inspect "${POSTGRES_CONTAINER}" --format='{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Source}}{{end}}{{end}}')
fi

echo -e "${BLUE}[2/3]${NC} Exporting volume: ${POSTGRES_VOLUME}"

# Export volume
docker run --rm \
    -v "${POSTGRES_VOLUME}:/source:ro" \
    -v "${PWD}/${EXPORT_DIR}:/backup" \
    alpine tar czf "/backup/postgres-volume-${TIMESTAMP}.tar.gz" -C /source .

FILE_SIZE=$(du -h "${EXPORT_FILE}" | cut -f1)
echo -e "${GREEN}✓${NC} Volume exported: ${EXPORT_FILE} (${FILE_SIZE})"

# Get database info
echo -e "\n${BLUE}[3/3]${NC} Database information:"
docker exec "${POSTGRES_CONTAINER}" psql -U hrms -d hrms_dev -c "
SELECT
    pg_size_pretty(pg_database_size('hrms_dev')) as db_size,
    (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public') as tables,
    (SELECT count(*) FROM users) as users;
" 2>/dev/null || echo "  (Database info unavailable)"

# Summary
echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                   Export Complete!                         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Export File:${NC} ${EXPORT_FILE} (${FILE_SIZE})"
echo ""
echo -e "${GREEN}Transfer to target system:${NC}"
echo "  scp ${EXPORT_FILE} user@target:/tmp/"
echo ""
echo -e "${GREEN}Import on target system:${NC}"
echo "  # Stop PostgreSQL container"
echo "  docker-compose stop postgres"
echo ""
echo "  # Create new volume"
echo "  docker volume create nu-aura-postgres-data"
echo ""
echo "  # Import data"
echo "  docker run --rm -v nu-aura-postgres-data:/target -v /tmp:/backup alpine tar xzf /backup/postgres-volume-${TIMESTAMP}.tar.gz -C /target"
echo ""
echo "  # Start PostgreSQL"
echo "  docker-compose up -d postgres"
echo ""
