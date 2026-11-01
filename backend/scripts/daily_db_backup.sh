#!/bin/bash

# Load environment variables from .env if present
ENV_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/.env"
if [ -f "$ENV_FILE" ]; then
  # Export DATABASE_URL and BACKUP_DIR if defined
  export $(grep -E '^(DATABASE_URL|BACKUP_DIR)=' "$ENV_FILE" | xargs)
fi

# Define variables
BACKUP_DIR="${BACKUP_DIR:-/mnt/storage/iex_db_backups}"
DB_URL="${DATABASE_URL}"

if [ -z "$DB_URL" ]; then
  echo "Error: DATABASE_URL is not set!"
  exit 1
fi
DATE=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="$BACKUP_DIR/prolt_operations_$DATE.sql.gz"

# Ensure the backup directory exists
mkdir -p "$BACKUP_DIR"

echo "Starting backup of Prolt_Operations at $DATE..."

# Dump the database and compress it
# --no-owner prevents permissions issues when restoring to a different environment
pg_dump --dbname="$DB_URL" --no-owner --no-privileges | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo "Backup completed successfully! Saved to $BACKUP_FILE"
  
  # Automatically delete backups older than 14 days to save disk space
  find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +14 -delete
  echo "Old backups cleaned up."
else
  echo "Error: Backup failed!"
  exit 1
fi
