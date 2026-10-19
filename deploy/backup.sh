#!/bin/sh
# Daily dump of every database (taxiline + taxiline_bot) into /root/backups, keeping the last
# KEEP_DAYS days. Installed as a root cron job, see DEPLOY.md ("Zaxira nusxa").
set -eu
# Dumps hold every user's phone number — readable by root only.
umask 077

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

# Off-site copy, so a lost server doesn't take its backups with it: the dump is encrypted and
# posted to a private Telegram group by a send-only bot. On when .env has BACKUP_BOT_TOKEN,
# BACKUP_CHAT_ID and BACKUP_PASSPHRASE. The passphrase must also be kept off this server.
# Decrypt:  openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in daily-….sql.gz.enc -out daily.sql.gz
env_value() {
  { grep -E "^$1=" .env || true; } | tail -n 1 | cut -d= -f2- | sed -e "s/^['\"]//" -e "s/['\"]\$//"
}
BOT_TOKEN=$(env_value BACKUP_BOT_TOKEN)
CHAT_ID=$(env_value BACKUP_CHAT_ID)
PASSPHRASE=$(env_value BACKUP_PASSPHRASE)
[ -n "$BOT_TOKEN" ] && [ -n "$CHAT_ID" ] && [ -n "$PASSPHRASE" ] || exit 0

ENC="$FILE.enc"
trap 'rm -f "$ENC"' EXIT
if ! BACKUP_PASSPHRASE="$PASSPHRASE" openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt \
  -in "$FILE" -out "$ENC" -pass env:BACKUP_PASSPHRASE; then
  echo "$(date '+%F %T') offsite FAILED: encryption"
  exit 1
fi
CAPTION="TaxiLine backup $(date '+%F %H:%M') · $(du -h "$FILE" | cut -f1) · shifrlangan"
# The token goes in through stdin (curl -K -), not argv, so it never shows up in `ps`.
if printf 'url = "https://api.telegram.org/bot%s/sendDocument"\n' "$BOT_TOKEN" |
  curl -sf -m 120 -K - -F chat_id="$CHAT_ID" -F caption="$CAPTION" -F document=@"$ENC" >/dev/null; then
  echo "$(date '+%F %T') offsite ok"
else
  echo "$(date '+%F %T') offsite FAILED: telegram"
  exit 1
fi
