#!/bin/bash

################################################################################
# NU-AURA Docker Database Import Script
# Purpose: Import database backup into Docker PostgreSQL container
# Usage: ./docker-db-import.sh <backup_file.sql>
################################################################################

set -e

# Check if backup file is provided
if [ $# -eq 0 ]; then
    echo "Error: No backup file specified"
    echo "Usage: ./docker-db-import.sh <backup_file.sql>"
    echo "Example: ./docker-db-import.sh db-backups/nuaura_docker_backup_20260318_020000.sql"
    exit 1
fi

BACKUP_FILE="$1"

# Check if file exists
if [ ! -f "${BACKUP_FILE}" ]; then
    echo "Error: Backup file not found: ${BACKUP_FILE}"
    exit 1
fi

# Docker configuration
CONTAINER_NAME="nu-aura-postgres"
DB_NAME="hrms_db"
DB_USER="postgres"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       NU-AURA Docker Database Import Script               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

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
        echo "Starting containers with docker-compose..."
        docker-compose up -d postgres
        sleep 5
        CONTAINER_NAME=$(docker ps --format '{{.Names}}' | grep -i postgres | head -1)
    else
        echo -e "${BLUE}ℹ${NC} Using container: ${CONTAINER_NAME}"
    fi
fi

echo -e "${YELLOW}WARNING: This will DROP and recreate the database!${NC}"
echo "Backup file: ${BACKUP_FILE}"
echo "Container:   ${CONTAINER_NAME}"
echo ""
read -p "Continue? (yes/no): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Import cancelled."
    exit 0
fi

# Detect file type
if [[ "${BACKUP_FILE}" == *.gz ]]; then
    echo -e "${BLUE}[1/3]${NC} Detected compressed backup, decompressing..."
    gunzip -c "${BACKUP_FILE}" | docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d postgres
elif [[ "${BACKUP_FILE}" == *.dump ]]; then
    echo -e "${BLUE}[1/3]${NC} Detected custom format backup, using pg_restore..."
    # Copy file to container
    docker cp "${BACKUP_FILE}" "${CONTAINER_NAME}:/tmp/restore.dump"
    # Restore
    docker exec "${CONTAINER_NAME}" pg_restore \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        --clean \
        --if-exists \
        -v \
        /tmp/restore.dump
    # Cleanup
    docker exec "${CONTAINER_NAME}" rm /tmp/restore.dump
else
    echo -e "${BLUE}[1/3]${NC} Importing plain SQL backup..."
    docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d postgres < "${BACKUP_FILE}"
fi

echo -e "${GREEN}✓${NC} Database imported successfully"

# Verify import
echo -e "\n${BLUE}[2/3]${NC} Verifying import..."
TABLE_COUNT=$(docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" -t -c \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")

echo -e "${GREEN}✓${NC} Found ${TABLE_COUNT} tables in database"

# Show row counts
echo -e "\n${BLUE}[3/3]${NC} Database statistics:"
docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" -c "
SELECT
    'Tenants' AS table_name, COUNT(*)::text AS rows FROM tenants
UNION ALL SELECT 'Users', COUNT(*)::text FROM users
UNION ALL SELECT 'Employees', COUNT(*)::text FROM employees
UNION ALL SELECT 'Departments', COUNT(*)::text FROM departments
UNION ALL SELECT 'Roles', COUNT(*)::text FROM roles
UNION ALL SELECT 'Permissions', COUNT(*)::text FROM permissions;
"

# Summary
echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    Import Complete!                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo "  1. Restart backend container:"
echo "     docker-compose restart backend"
echo "  2. Check application logs:"
echo "     docker-compose logs -f backend"
echo "  3. Test application:"
echo "     curl http://localhost:8080/api/health"
echo ""
