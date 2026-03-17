#!/bin/bash

################################################################################
# NU-AURA Complete Docker Export Script
# Purpose: Export all Docker containers, images, and volumes
# Usage: ./docker-full-export.sh
################################################################################

set -e

# Configuration
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
EXPORT_DIR="./docker-exports"
EXPORT_NAME="nuaura_docker_${TIMESTAMP}"
EXPORT_PATH="${EXPORT_DIR}/${EXPORT_NAME}"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       NU-AURA Complete Docker Export Script               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Create export directory
mkdir -p "${EXPORT_PATH}"
echo -e "${GREEN}✓${NC} Created export directory: ${EXPORT_PATH}"

# Step 1: Export PostgreSQL container
echo -e "\n${BLUE}[1/6]${NC} Exporting PostgreSQL container..."
POSTGRES_CONTAINER=$(docker ps --format '{{.Names}}' | grep -i postgres | head -1)

if [ -z "$POSTGRES_CONTAINER" ]; then
    echo -e "${RED}✗${NC} PostgreSQL container not running!"
    exit 1
fi

echo -e "  Container: ${POSTGRES_CONTAINER}"
docker export "${POSTGRES_CONTAINER}" | gzip > "${EXPORT_PATH}/postgres-container.tar.gz"
echo -e "${GREEN}✓${NC} PostgreSQL container exported: postgres-container.tar.gz"

# Step 2: Export PostgreSQL image
echo -e "\n${BLUE}[2/6]${NC} Exporting PostgreSQL image..."
POSTGRES_IMAGE=$(docker inspect "${POSTGRES_CONTAINER}" --format='{{.Config.Image}}')
echo -e "  Image: ${POSTGRES_IMAGE}"
docker save "${POSTGRES_IMAGE}" | gzip > "${EXPORT_PATH}/postgres-image.tar.gz"
echo -e "${GREEN}✓${NC} PostgreSQL image exported: postgres-image.tar.gz"

# Step 3: Export PostgreSQL volume
echo -e "\n${BLUE}[3/6]${NC} Exporting PostgreSQL data volume..."
POSTGRES_VOLUME=$(docker inspect "${POSTGRES_CONTAINER}" --format='{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Name}}{{end}}{{end}}')

if [ -n "$POSTGRES_VOLUME" ]; then
    echo -e "  Volume: ${POSTGRES_VOLUME}"
    docker run --rm \
        -v "${POSTGRES_VOLUME}:/data" \
        -v "${PWD}/${EXPORT_PATH}:/backup" \
        alpine tar czf "/backup/postgres-volume.tar.gz" /data
    echo -e "${GREEN}✓${NC} PostgreSQL volume exported: postgres-volume.tar.gz"
else
    echo -e "${YELLOW}⚠${NC} No named volume found, skipping..."
fi

# Step 4: Export backend container (if exists)
echo -e "\n${BLUE}[4/6]${NC} Checking for backend container..."
BACKEND_CONTAINER=$(docker ps --format '{{.Names}}' | grep -E 'backend|hrms-backend|nu-aura-backend' | head -1)

if [ -n "$BACKEND_CONTAINER" ]; then
    echo -e "  Container: ${BACKEND_CONTAINER}"
    docker export "${BACKEND_CONTAINER}" | gzip > "${EXPORT_PATH}/backend-container.tar.gz"

    BACKEND_IMAGE=$(docker inspect "${BACKEND_CONTAINER}" --format='{{.Config.Image}}')
    docker save "${BACKEND_IMAGE}" | gzip > "${EXPORT_PATH}/backend-image.tar.gz"
    echo -e "${GREEN}✓${NC} Backend container exported"
else
    echo -e "${YELLOW}⚠${NC} Backend container not running, skipping..."
fi

# Step 5: Export docker-compose.yml
echo -e "\n${BLUE}[5/6]${NC} Copying docker-compose.yml..."
if [ -f "../docker-compose.yml" ]; then
    cp "../docker-compose.yml" "${EXPORT_PATH}/docker-compose.yml"
    echo -e "${GREEN}✓${NC} docker-compose.yml copied"
else
    echo -e "${YELLOW}⚠${NC} docker-compose.yml not found"
fi

# Step 6: Create import script
echo -e "\n${BLUE}[6/6]${NC} Creating import script..."
cat > "${EXPORT_PATH}/import.sh" << 'IMPORT_SCRIPT'
#!/bin/bash
set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║       NU-AURA Docker Import Script                        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Load PostgreSQL image
if [ -f "postgres-image.tar.gz" ]; then
    echo "[1/4] Loading PostgreSQL image..."
    gunzip -c postgres-image.tar.gz | docker load
    echo "✓ PostgreSQL image loaded"
fi

# Import PostgreSQL volume
if [ -f "postgres-volume.tar.gz" ]; then
    echo ""
    echo "[2/4] Importing PostgreSQL volume..."
    VOLUME_NAME="nu-aura-postgres-data"
    docker volume create "${VOLUME_NAME}"
    docker run --rm \
        -v "${VOLUME_NAME}:/data" \
        -v "$(pwd):/backup" \
        alpine sh -c "cd /data && tar xzf /backup/postgres-volume.tar.gz --strip 1"
    echo "✓ PostgreSQL volume imported: ${VOLUME_NAME}"
fi

# Load backend image
if [ -f "backend-image.tar.gz" ]; then
    echo ""
    echo "[3/4] Loading backend image..."
    gunzip -c backend-image.tar.gz | docker load
    echo "✓ Backend image loaded"
fi

# Start containers
if [ -f "docker-compose.yml" ]; then
    echo ""
    echo "[4/4] Starting containers with docker-compose..."
    docker-compose up -d
    echo "✓ Containers started"
    echo ""
    echo "Check status:"
    docker-compose ps
else
    echo ""
    echo "[4/4] No docker-compose.yml found, skipping container startup"
    echo "Start containers manually with:"
    echo "  docker run -d -v nu-aura-postgres-data:/var/lib/postgresql/data -p 5432:5432 <postgres-image>"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                 Import Complete!                           ║"
echo "╚════════════════════════════════════════════════════════════╝"
IMPORT_SCRIPT

chmod +x "${EXPORT_PATH}/import.sh"
echo -e "${GREEN}✓${NC} Import script created: import.sh"

# Create archive
echo -e "\n${BLUE}[BONUS]${NC} Creating single archive file..."
cd "${EXPORT_DIR}"
tar czf "${EXPORT_NAME}.tar.gz" "${EXPORT_NAME}/"
ARCHIVE_SIZE=$(du -h "${EXPORT_NAME}.tar.gz" | cut -f1)
echo -e "${GREEN}✓${NC} Archive created: ${EXPORT_NAME}.tar.gz (${ARCHIVE_SIZE})"

# Get file sizes
echo -e "\n${BLUE}Export Summary:${NC}"
du -h "${EXPORT_NAME}"/* | awk '{printf "  %-40s %8s\n", $2, $1}'
echo ""
echo -e "  ${YELLOW}Total archive:${NC} ${EXPORT_NAME}.tar.gz (${ARCHIVE_SIZE})"

# Summary
echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                   Export Complete!                         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Export Package:${NC} ${EXPORT_DIR}/${EXPORT_NAME}.tar.gz"
echo ""
echo -e "${GREEN}What's included:${NC}"
echo "  • PostgreSQL container"
echo "  • PostgreSQL image"
echo "  • PostgreSQL data volume"
echo "  • Backend container (if running)"
echo "  • Backend image (if exists)"
echo "  • docker-compose.yml"
echo "  • Auto-import script"
echo ""
echo -e "${GREEN}Transfer to target system:${NC}"
echo "  scp ${EXPORT_NAME}.tar.gz user@target:/tmp/"
echo ""
echo -e "${GREEN}On target system:${NC}"
echo "  tar xzf ${EXPORT_NAME}.tar.gz"
echo "  cd ${EXPORT_NAME}"
echo "  ./import.sh"
echo ""
