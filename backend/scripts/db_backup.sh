#!/bin/bash
set -e

# Default backup directory
BACKUP_DIR="/app/uploads/backups"
mkdir -p "$BACKUP_DIR"

# Generate filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="db_backup_${TIMESTAMP}.sql.gz"
FILEPATH="${BACKUP_DIR}/${FILENAME}"

echo "[DB Backup] Starting backup to ${FILEPATH}..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "[DB Backup] ERROR: DATABASE_URL is not set!"
    exit 1
fi

# Run pg_dump and compress on the fly
# pg_dump natively supports connection URIs
pg_dump "$DATABASE_URL" | gzip > "$FILEPATH"

echo "[DB Backup] Backup completed successfully."

# Cleanup backups older than 7 days
echo "[DB Backup] Cleaning up backups older than 7 days..."
find "$BACKUP_DIR" -type f -name "db_backup_*.sql.gz" -mtime +7 -exec rm {} \;

echo "[DB Backup] Cleanup completed."
