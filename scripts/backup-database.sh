#!/bin/bash

# TableScan Database Backup Script
# Run this script via cron job for automated backups

set -e

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/tablescan_backup_${TIMESTAMP}.sql"
RETENTION_DAYS=7

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}Starting database backup...${NC}"

# Create backup directory if it doesn't exist
mkdir -p ${BACKUP_DIR}

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
elif [ -f .env.production ]; then
    export $(cat .env.production | grep -v '^#' | xargs)
else
    echo -e "${RED}Error: .env file not found${NC}"
    exit 1
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL not set in environment${NC}"
    exit 1
fi

# Extract database connection details from DATABASE_URL
# Format: postgresql://user:password@host:port/database
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_USER=$(echo $DATABASE_URL | sed -n 's/\/\/\([^:]*\):.*/\1/p')
DB_PASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\([^@]*\)@.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

# Perform backup
echo -e "${YELLOW}Backing up database: ${DB_NAME}${NC}"
PGPASSWORD=$DB_PASSWORD pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME > ${BACKUP_FILE}

# Compress backup
echo -e "${YELLOW}Compressing backup...${NC}"
gzip ${BACKUP_FILE}

# Delete old backups (older than RETENTION_DAYS)
echo -e "${YELLOW}Cleaning up old backups (older than ${RETENTION_DAYS} days)...${NC}"
find ${BACKUP_DIR} -name "tablescan_backup_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete

echo -e "${GREEN}✅ Backup completed successfully: ${BACKUP_FILE}.gz${NC}"

# Optional: Upload to cloud storage (AWS S3, Google Cloud Storage, etc.)
# Uncomment and configure as needed
# aws s3 cp ${BACKUP_FILE}.gz s3://your-bucket/backups/
