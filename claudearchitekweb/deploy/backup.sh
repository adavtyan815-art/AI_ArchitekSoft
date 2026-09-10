#!/usr/bin/env bash
# Nightly backup of uploads (and a DB snapshot) to an rclone remote, e.g. Cloudflare R2.
# Setup once:  rclone config   (create remote "r2")   then add to cron:  0 3 * * * /app/deploy/backup.sh
set -euo pipefail
DATA_DIR="${DATA_DIR:-/var/lib/docker/volumes/deploy_appdata/_data}"
REMOTE="${REMOTE:-r2:architeksoft-backups}"
STAMP=$(date +%F)
sqlite3 "$DATA_DIR/architeksoft.db" ".backup '/tmp/architeksoft-$STAMP.db'"
rclone copy "/tmp/architeksoft-$STAMP.db" "$REMOTE/db/"
rclone sync "$DATA_DIR/uploads" "$REMOTE/uploads" --fast-list
rm -f "/tmp/architeksoft-$STAMP.db"
echo "backup done $STAMP"
