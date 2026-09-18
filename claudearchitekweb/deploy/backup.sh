#!/usr/bin/env bash
# Nightly backup of uploads (and a DB snapshot) to an rclone remote, e.g. Cloudflare R2.
#
# Runs on the HOST (not inside the web container): the host needs `sqlite3` and `rclone`
#   sudo apt-get install -y sqlite3 rclone
# Setup once:  rclone config   (create remote "r2"), then add to the host's crontab (crontab -e),
# using the path of your checkout, e.g.:
#   0 3 * * * bash /opt/architeksoft/claudearchitekweb/deploy/backup.sh >> /var/log/architeksoft-backup.log 2>&1
#
# Deleted or replaced uploads are not lost: rclone moves them to uploads-deleted/<date>/ on the remote.
# Add a lifecycle rule on the bucket that expires uploads-deleted/ after 30–90 days.
set -euo pipefail
DATA_DIR="${DATA_DIR:-/var/lib/docker/volumes/deploy_appdata/_data}"
REMOTE="${REMOTE:-r2:architeksoft-backups}"
# Refuse to continue when one run would delete more than this many files from the remote
# (an emptied or unmounted uploads directory must never wipe the backup).
MAX_DELETE="${MAX_DELETE:-50}"
STAMP=$(date +%F)
SNAPSHOT="$(mktemp -d)/architeksoft-$STAMP.db"
trap 'rm -rf "$(dirname "$SNAPSHOT")"' EXIT

if [ ! -f "$DATA_DIR/architeksoft.db" ]; then
  echo "backup failed: $DATA_DIR/architeksoft.db not found (set DATA_DIR)" >&2
  exit 1
fi
if [ ! -d "$DATA_DIR/uploads" ]; then
  echo "backup failed: $DATA_DIR/uploads not found — refusing to sync an absent directory" >&2
  exit 1
fi

sqlite3 "$DATA_DIR/architeksoft.db" ".backup '$SNAPSHOT'"
rclone copy "$SNAPSHOT" "$REMOTE/db/"
rclone sync "$DATA_DIR/uploads" "$REMOTE/uploads" --fast-list \
  --backup-dir "$REMOTE/uploads-deleted/$STAMP" --max-delete "$MAX_DELETE"
echo "backup done $STAMP"
