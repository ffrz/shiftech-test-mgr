#!/usr/bin/env bash
#
# Supabase keep-alive: kirim 1 request ringan ke REST API (PostgREST) supaya
# project free tier tidak di-pause karena tidak ada aktivitas selama 7 hari.
# Memanggil RPC ping() yang membaca tabel di Postgres (bukan sekadar ping
# halaman frontend), dan memverifikasi isi respons, bukan hanya status HTTP.
#
# Kredensial dibaca dari env file (default: frontend/.env, atau path lain lewat
# argumen pertama / env KEEPALIVE_ENV_FILE). Hanya butuh anon key (publik) --
# JANGAN pakai service_role di sini.
#
# Coba lokal:
#   bash deploy/supabase-keepalive.sh
#
# Di server (cron harian jam 03:00):
#   0 3 * * * /opt/scripts/supabase-keepalive.sh /opt/scripts/keepalive.env
#
# Exit code: 0 = sukses (HTTP 2xx + body ok:true), 1 = gagal.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${1:-${KEEPALIVE_ENV_FILE:-$SCRIPT_DIR/../frontend/.env}}"
LOG_FILE="${KEEPALIVE_LOG_FILE:-}"

log() {
  local line
  line="$(date -Is) $*"
  echo "$line"
  if [ -n "$LOG_FILE" ]; then echo "$line" >> "$LOG_FILE"; fi
}

if [ ! -f "$ENV_FILE" ]; then
  log "ERROR env file tidak ditemukan: $ENV_FILE"
  exit 1
fi

# Ambil nilai tanpa `source` (hindari eksekusi isi file); buang CR & kutip.
read_var() {
  grep -E "^$1=" "$ENV_FILE" | tail -n1 | cut -d= -f2- | tr -d '\r"' | sed "s/'//g"
}

SUPABASE_URL="$(read_var VITE_SUPABASE_URL)"
ANON_KEY="$(read_var VITE_SUPABASE_ANON_KEY)"

if [ -z "$SUPABASE_URL" ] || [ -z "$ANON_KEY" ]; then
  log "ERROR VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY kosong di $ENV_FILE"
  exit 1
fi

body_file="$(mktemp)"
trap 'rm -f "$body_file"' EXIT

# POST ke RPC ping() (lihat supabase/migrations/*_keepalive_ping.sql): fungsi
# security definer yang benar-benar membaca tabel, jadi sukses = Postgres hidup.
status="$(curl -s -o "$body_file" -w '%{http_code}' --max-time 20 -X POST \
  "${SUPABASE_URL%/}/rest/v1/rpc/ping" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" -d '{}' || echo 000)"

if [ "${status:0:1}" = "2" ] && grep -q '"ok": *true' "$body_file"; then
  log "OK keepalive rpc=ping status=$status $(tr -d '\n' < "$body_file")"
  exit 0
fi

log "FAIL keepalive rpc=ping status=$status body=$(head -c 200 "$body_file")"
exit 1
