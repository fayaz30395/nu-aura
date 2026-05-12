#!/bin/bash

################################################################################
# NU-AURA Docker Database Initialization Script
# Purpose: Auto-restore database on Docker container startup
# Usage: Place in docker-entrypoint-initdb.d/ or run manually
################################################################################

set -e

# Configuration
DB_NAME="hrms_db"
DB_USER="postgres"
RESTORE_FILE="/docker-entrypoint-initdb.d/init-backup.sql"

# Colors for logging
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}NU-AURA Database Initialization${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Check if database already exists
if psql -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo -e "${YELLOW}Database '$DB_NAME' already exists. Skipping initialization.${NC}"
    echo ""
    echo "To re-initialize, run:"
    echo "  docker exec -it postgres-container dropdb -U postgres $DB_NAME"
    echo "  docker restart postgres-container"
    exit 0
fi

echo -e "${BLUE}[1/4]${NC} Creating database: $DB_NAME"
createdb -U "$DB_USER" "$DB_NAME"
echo -e "${GREEN}✓${NC} Database created"

echo -e "\n${BLUE}[2/4]${NC} Enabling extensions..."
psql -U "$DB_USER" -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
psql -U "$DB_USER" -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";"
echo -e "${GREEN}✓${NC} Extensions enabled"

# Check if restore file exists
if [ -f "$RESTORE_FILE" ]; then
    echo -e "\n${BLUE}[3/4]${NC} Found initialization backup: $RESTORE_FILE"
    echo "Restoring database from backup..."

    # Detect file type and restore
    if [[ "$RESTORE_FILE" == *.gz ]]; then
        gunzip -c "$RESTORE_FILE" | psql -U "$DB_USER" -d "$DB_NAME"
    elif [[ "$RESTORE_FILE" == *.dump ]]; then
        pg_restore -U "$DB_USER" -d "$DB_NAME" "$RESTORE_FILE"
    else
        psql -U "$DB_USER" -d "$DB_NAME" -f "$RESTORE_FILE"
    fi

    echo -e "${GREEN}✓${NC} Database restored from backup"

    # Verify
    TABLE_COUNT=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
    echo -e "${GREEN}✓${NC} Verified: ${TABLE_COUNT} tables restored"
else
    echo -e "\n${BLUE}[3/4]${NC} No initialization backup found at: $RESTORE_FILE"
    echo "Creating empty database..."
    echo -e "${YELLOW}ℹ${NC} Application will run Flyway migrations on first start"
fi

echo -e "\n${BLUE}[4/4]${NC} Setting permissions..."
psql -U "$DB_USER" -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
echo -e "${GREEN}✓${NC} Permissions set"

echo ""
echo -e "${BLUE}================================${NC}"
echo -e "${GREEN}Initialization Complete!${NC}"
echo -e "${BLUE}================================${NC}"
echo ""
echo "Database: $DB_NAME"
echo "User:     $DB_USER"
echo "Ready for connections!"
echo ""
