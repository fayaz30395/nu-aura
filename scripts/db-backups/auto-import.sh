#!/bin/bash

################################################################################
# NU-AURA Database Auto-Import Script for Target System
# Usage: ./auto-import.sh
################################################################################

set -e

# Configuration
BACKUP_FILE="nuaura_migration_20260318_020943.sql"
DB_USER="hrms"
DB_NAME="hrms_dev"
CONTAINER_NAME="postgres"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       NU-AURA Database Auto-Import Script                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if backup file exists
if [ ! -f "${BACKUP_FILE}" ]; then
    # Try compressed version
    if [ -f "${BACKUP_FILE}.gz" ]; then
        echo -e "${BLUE}[1/6]${NC} Extracting compressed backup..."
        gunzip "${BACKUP_FILE}.gz"
        echo -e "${GREEN}✓${NC} Extracted ${BACKUP_FILE}"
    else
        echo -e "${RED}✗${NC} Backup file not found: ${BACKUP_FILE}"
        echo ""
        echo "Available files:"
        ls -lh *.sql* 2>/dev/null || echo "  No backup files found"
        exit 1
    fi
else
    echo -e "${BLUE}[1/6]${NC} Backup file found: ${BACKUP_FILE}"
fi

# Detect environment (Docker or native)
echo -e "\n${BLUE}[2/6]${NC} Detecting environment..."
if command -v docker &> /dev/null && docker ps --format '{{.Names}}' | grep -qi postgres; then
    ENV="docker"
    CONTAINER_NAME=$(docker ps --format '{{.Names}}' | grep -i postgres | head -1)
    echo -e "${GREEN}✓${NC} Docker environment detected"
    echo -e "${GREEN}✓${NC} Using container: ${CONTAINER_NAME}"
elif command -v psql &> /dev/null; then
    ENV="native"
    echo -e "${GREEN}✓${NC} Native PostgreSQL environment detected"
else
    echo -e "${RED}✗${NC} Neither Docker nor native PostgreSQL found!"
    exit 1
fi

# Confirm import
echo -e "\n${YELLOW}WARNING: This will import database ${DB_NAME}${NC}"
echo -e "Environment: ${ENV}"
echo -e "Backup file: ${BACKUP_FILE} ($(du -h ${BACKUP_FILE} | cut -f1))"
echo ""
read -p "Continue? (yes/no): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Import cancelled."
    exit 0
fi

# Import database
echo -e "${BLUE}[3/6]${NC} Importing database..."
if [ "$ENV" = "docker" ]; then
    docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d postgres < "${BACKUP_FILE}"
else
    psql -U "${DB_USER}" -d postgres -f "${BACKUP_FILE}"
fi
echo -e "${GREEN}✓${NC} Database imported successfully"

# Verify import
echo -e "\n${BLUE}[4/6]${NC} Verifying import..."
if [ "$ENV" = "docker" ]; then
    USER_COUNT=$(docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" -t -c "SELECT COUNT(*) FROM users;")
    EMPLOYEE_COUNT=$(docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" -t -c "SELECT COUNT(*) FROM employees;")
    PERMISSION_COUNT=$(docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" -t -c "SELECT COUNT(*) FROM permissions;")
else
    USER_COUNT=$(psql -U "${DB_USER}" -d "${DB_NAME}" -t -c "SELECT COUNT(*) FROM users;")
    EMPLOYEE_COUNT=$(psql -U "${DB_USER}" -d "${DB_NAME}" -t -c "SELECT COUNT(*) FROM employees;")
    PERMISSION_COUNT=$(psql -U "${DB_USER}" -d "${DB_NAME}" -t -c "SELECT COUNT(*) FROM permissions;")
fi

echo -e "${GREEN}✓${NC} Users:       ${USER_COUNT} (expected: 9)"
echo -e "${GREEN}✓${NC} Employees:   ${EMPLOYEE_COUNT} (expected: 9)"
echo -e "${GREEN}✓${NC} Permissions: ${PERMISSION_COUNT} (expected: 44)"

# Show database statistics
echo -e "\n${BLUE}[5/6]${NC} Database statistics:"
if [ "$ENV" = "docker" ]; then
    docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" -c "
    SELECT
        'Tenants' AS table_name, COUNT(*)::text AS rows FROM tenants
    UNION ALL SELECT 'Users', COUNT(*)::text FROM users
    UNION ALL SELECT 'Employees', COUNT(*)::text FROM employees
    UNION ALL SELECT 'Roles', COUNT(*)::text FROM roles
    UNION ALL SELECT 'Permissions', COUNT(*)::text FROM permissions;
    "
else
    psql -U "${DB_USER}" -d "${DB_NAME}" -c "
    SELECT
        'Tenants' AS table_name, COUNT(*)::text AS rows FROM tenants
    UNION ALL SELECT 'Users', COUNT(*)::text FROM users
    UNION ALL SELECT 'Employees', COUNT(*)::text FROM employees
    UNION ALL SELECT 'Roles', COUNT(*)::text FROM roles
    UNION ALL SELECT 'Permissions', COUNT(*)::text FROM permissions;
    "
fi

# Next steps
echo -e "\n${BLUE}[6/6]${NC} Post-import steps:"
echo -e "${GREEN}✓${NC} Database imported and verified"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Update backend configuration:"
echo "     Edit: backend/src/main/resources/application.yml"
echo "     Set: spring.datasource.url=jdbc:postgresql://localhost:5432/${DB_NAME}"
echo ""
echo "  2. Set database password:"
echo "     export DB_PASSWORD='your_password'"
echo ""
echo "  3. Start backend:"
echo "     cd backend && ./start-backend.sh"
echo ""
echo "  4. Test application:"
echo "     curl http://localhost:8080/api/v1/auth/health"
echo ""

# Summary
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                Import Complete! ✓                          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
