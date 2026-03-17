#!/bin/bash

################################################################################
# NU-AURA Database Import Script
# Purpose: Import database backup on target system
# Usage: ./db-import.sh <backup_file.sql>
################################################################################

set -e  # Exit on error

# Check if backup file is provided
if [ $# -eq 0 ]; then
    echo "Error: No backup file specified"
    echo "Usage: ./db-import.sh <backup_file.sql>"
    echo "Example: ./db-import.sh db-backups/nuaura_full_backup_20260318_020000.sql"
    exit 1
fi

BACKUP_FILE="$1"

# Check if file exists
if [ ! -f "${BACKUP_FILE}" ]; then
    echo "Error: Backup file not found: ${BACKUP_FILE}"
    exit 1
fi

# Database connection details (modify for target system)
DB_HOST="localhost"
DB_PORT="5432"
DB_USER="postgres"
DB_PASSWORD="postgres123"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          NU-AURA Database Import Script                   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}WARNING: This will DROP and recreate the database!${NC}"
echo -e "Backup file: ${BACKUP_FILE}"
echo -e "Target host: ${DB_HOST}:${DB_PORT}"
echo ""
read -p "Continue? (yes/no): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Import cancelled."
    exit 0
fi

# Set password for psql
export PGPASSWORD="${DB_PASSWORD}"

# Import the backup
echo -e "${BLUE}[1/2]${NC} Importing database..."
psql -h "${DB_HOST}" \
     -p "${DB_PORT}" \
     -U "${DB_USER}" \
     -d postgres \
     -v ON_ERROR_STOP=1 \
     -f "${BACKUP_FILE}"

echo -e "${GREEN}✓${NC} Database imported successfully"

# Verify import
echo -e "\n${BLUE}[2/2]${NC} Verifying import..."
TABLE_COUNT=$(psql -h "${DB_HOST}" \
                   -p "${DB_PORT}" \
                   -U "${DB_USER}" \
                   -d hrms_db \
                   -t \
                   -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")

echo -e "${GREEN}✓${NC} Found ${TABLE_COUNT} tables in database"

# Unset password
unset PGPASSWORD

# Summary
echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    Import Complete!                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo -e "  1. Update backend application.yml with new database credentials"
echo -e "  2. Restart the backend: cd backend && ./start-backend.sh"
echo -e "  3. Verify data: psql -U postgres -d hrms_db"
echo ""
