#!/bin/bash

################################################################################
# NU-AURA Database Export Script
# Purpose: Export complete database for migration to another system
# Usage: ./db-export.sh
################################################################################

set -e  # Exit on error

# Configuration
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./db-backups"
BACKUP_FILE="${BACKUP_DIR}/nuaura_full_backup_${TIMESTAMP}.sql"
SCHEMA_ONLY_FILE="${BACKUP_DIR}/nuaura_schema_${TIMESTAMP}.sql"
DATA_ONLY_FILE="${BACKUP_DIR}/nuaura_data_${TIMESTAMP}.sql"

# Database connection details (from docker-compose.yml)
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="hrms_db"
DB_USER="postgres"
DB_PASSWORD="postgres123"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          NU-AURA Database Export Script                   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Create backup directory
mkdir -p "${BACKUP_DIR}"
echo -e "${GREEN}✓${NC} Created backup directory: ${BACKUP_DIR}"

# Set password for pg_dump
export PGPASSWORD="${DB_PASSWORD}"

# 1. Full backup (schema + data)
echo -e "\n${BLUE}[1/3]${NC} Exporting full database (schema + data)..."
pg_dump -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        --verbose \
        --clean \
        --if-exists \
        --create \
        --format=plain \
        --file="${BACKUP_FILE}"

echo -e "${GREEN}✓${NC} Full backup saved: ${BACKUP_FILE}"

# 2. Schema only backup
echo -e "\n${BLUE}[2/3]${NC} Exporting schema only..."
pg_dump -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        --schema-only \
        --verbose \
        --clean \
        --if-exists \
        --create \
        --format=plain \
        --file="${SCHEMA_ONLY_FILE}"

echo -e "${GREEN}✓${NC} Schema backup saved: ${SCHEMA_ONLY_FILE}"

# 3. Data only backup
echo -e "\n${BLUE}[3/3]${NC} Exporting data only..."
pg_dump -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        --data-only \
        --verbose \
        --column-inserts \
        --format=plain \
        --file="${DATA_ONLY_FILE}"

echo -e "${GREEN}✓${NC} Data backup saved: ${DATA_ONLY_FILE}"

# Unset password
unset PGPASSWORD

# Get file sizes
FULL_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
SCHEMA_SIZE=$(du -h "${SCHEMA_ONLY_FILE}" | cut -f1)
DATA_SIZE=$(du -h "${DATA_ONLY_FILE}" | cut -f1)

# Summary
echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    Export Complete!                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Export Summary:"
echo -e "  Full Backup:   ${BACKUP_FILE} (${FULL_SIZE})"
echo -e "  Schema Only:   ${SCHEMA_ONLY_FILE} (${SCHEMA_SIZE})"
echo -e "  Data Only:     ${DATA_ONLY_FILE} (${DATA_SIZE})"
echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo -e "  1. Transfer files to target system"
echo -e "  2. Run: ./db-import.sh ${BACKUP_FILE}"
echo -e "  3. Or import manually: psql -U postgres -d postgres -f ${BACKUP_FILE}"
echo ""
