#!/bin/bash

################################################################################
# NU-AURA Docker Database Export Script
# Purpose: Export PostgreSQL database from Docker container
# Usage: ./docker-db-export.sh
################################################################################

set -e

# Configuration
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./db-backups"
BACKUP_FILE="${BACKUP_DIR}/nuaura_docker_backup_${TIMESTAMP}.sql"

# Docker configuration (from docker-compose.yml)
CONTAINER_NAME="nu-aura-postgres"  # Adjust if different
DB_NAME="hrms_db"
DB_USER="postgres"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       NU-AURA Docker Database Export Script               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Create backup directory
mkdir -p "${BACKUP_DIR}"
echo -e "${GREEN}✓${NC} Created backup directory: ${BACKUP_DIR}"

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    # Try to find postgres container with different name
    CONTAINER_NAME=$(docker ps --format '{{.Names}}' | grep -i postgres | head -1)

    if [ -z "$CONTAINER_NAME" ]; then
        echo -e "${RED}✗${NC} PostgreSQL container not found!"
        echo ""
        echo "Available containers:"
        docker ps --format "  - {{.Names}} ({{.Image}})"
        echo ""
        echo "Tip: Update CONTAINER_NAME in this script or start the container:"
        echo "  docker-compose up -d postgres"
        exit 1
    else
        echo -e "${BLUE}ℹ${NC} Using container: ${CONTAINER_NAME}"
    fi
fi

# Method 1: Direct dump (fastest)
echo -e "\n${BLUE}[1/3]${NC} Exporting full database from Docker container..."
docker exec -t "${CONTAINER_NAME}" pg_dump \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    --clean \
    --if-exists \
    --create \
    --verbose \
    > "${BACKUP_FILE}"

echo -e "${GREEN}✓${NC} Full backup saved: ${BACKUP_FILE}"

# Method 2: Compressed backup
COMPRESSED_FILE="${BACKUP_DIR}/nuaura_docker_backup_${TIMESTAMP}.sql.gz"
echo -e "\n${BLUE}[2/3]${NC} Creating compressed backup..."
docker exec -t "${CONTAINER_NAME}" pg_dump \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    --clean \
    --if-exists \
    | gzip > "${COMPRESSED_FILE}"

echo -e "${GREEN}✓${NC} Compressed backup saved: ${COMPRESSED_FILE}"

# Method 3: Custom format (for pg_restore)
CUSTOM_FILE="${BACKUP_DIR}/nuaura_docker_backup_${TIMESTAMP}.dump"
echo -e "\n${BLUE}[3/3]${NC} Creating custom format backup (for pg_restore)..."
docker exec -t "${CONTAINER_NAME}" pg_dump \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    -F custom \
    -f "/tmp/backup.dump"

docker cp "${CONTAINER_NAME}:/tmp/backup.dump" "${CUSTOM_FILE}"
docker exec "${CONTAINER_NAME}" rm /tmp/backup.dump

echo -e "${GREEN}✓${NC} Custom format backup saved: ${CUSTOM_FILE}"

# Get file sizes
PLAIN_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
COMPRESSED_SIZE=$(du -h "${COMPRESSED_FILE}" | cut -f1)
CUSTOM_SIZE=$(du -h "${CUSTOM_FILE}" | cut -f1)

# Get database statistics
echo -e "\n${BLUE}Database Statistics:${NC}"
docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" -t -c "
    SELECT
        pg_size_pretty(pg_database_size('${DB_NAME}')) AS size,
        (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public') AS tables,
        (SELECT count(*) FROM users) AS users,
        (SELECT count(*) FROM employees) AS employees
" | sed 's/^/  /'

# Summary
echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    Export Complete!                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Export Summary:"
echo "  Plain SQL:     ${BACKUP_FILE} (${PLAIN_SIZE})"
echo "  Compressed:    ${COMPRESSED_FILE} (${COMPRESSED_SIZE})"
echo "  Custom Format: ${CUSTOM_FILE} (${CUSTOM_SIZE})"
echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo "  1. Transfer files to target system"
echo "  2. On target system, run:"
echo "     ./docker-db-import.sh ${BACKUP_FILE}"
echo "  Or:"
echo "     docker exec -i postgres-container psql -U postgres < ${BACKUP_FILE}"
echo ""
