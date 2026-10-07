#!/bin/sh
# Daily dump of every database (taxiline + taxiline_bot) into /root/backups, keeping the last
# KEEP_DAYS days. Installed as a root cron job, see DEPLOY.md ("Zaxira nusxa").
set -eu

cd "$(dirname "$0")/.."
DIR=${BACKUP_DIR:-/root/backups}
KEEP_DAYS=${KEEP_DAYS:-14}
mkdir -p "$DIR"

DB_USER=$(docker compose exec -T postgres printenv POSTGRES_USER </dev/null)
FILE="$DIR/daily-$(date +%Y%m%d-%H%M).sql.gz"
TMP="$FILE.part"

docker compose exec -T postgres pg_dumpall -U "$DB_USER" </dev/null | gzip >"$TMP"
# A dump cut short (postgres down, disk full) must never replace a good one.
gzip -t "$TMP"
zcat "$TMP" | tail -n 3 | grep -q "PostgreSQL database cluster dump complete"
mv "$TMP" "$FILE"

find "$DIR" -name 'daily-*.sql.gz' -mtime +"$KEEP_DAYS" -delete
echo "$(date '+%F %T') ok $FILE $(du -h "$FILE" | cut -f1)"
