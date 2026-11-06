#!/usr/bin/env bash
#
# Build + redeploy Testify MCP server (Go, backend/mcp-server/cmd-http) ke VPS.
# Build cross-compile di lokal (server tidak butuh Go), upload ke
# /opt/testify-mcp/releases/<ts>/, flip symlink `current`, restart HANYA unit
# testify-mcp, health-check (MCP initialize saja — tidak menyentuh data), dan
# rollback otomatis ke release sebelumnya bila gagal.
#
#   bash backend/deploy/deploy-vps.sh              # build + deploy
#   bash backend/deploy/deploy-vps.sh --no-build   # pakai binary hasil build terakhir
#
# Prasyarat: Go, ssh, scp (WSL / Git Bash); key root ~/.ssh/shiftech_server1 (chmod 600);
# infra sudah di-provision Ansible (shiftech-server1: --tags testify_mcp,... —
# user, direktori, env file berisi DATABASE_URL, systemd unit); deploy/deploy.conf.local.
# DATABASE_URL TIDAK pernah ada di repo/script ini — hanya di env file server (0600).
set -euo pipefail

BUILD=1
for a in "$@"; do
  case "$a" in
    --no-build) BUILD=0 ;;
    *) echo "Argumen tidak dikenal: $a (pakai --no-build)" >&2; exit 1 ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CONF="$SCRIPT_DIR/deploy.conf.local"
[ -f "$CONF" ] || { echo "Config tidak ada: $CONF (copy dari deploy.conf.example)" >&2; exit 1; }
# shellcheck source=/dev/null
source "$CONF"
SERVER_HOST="${SERVER_HOST:?}"; SERVER_KEY="${SERVER_KEY:-$HOME/.ssh/shiftech_server1}"
INSTALL_DIR="${INSTALL_DIR:-/opt/testify-mcp}"; SERVICE="${SERVICE:-testify-mcp}"
HTTP_PORT="${HTTP_PORT:-8093}"; PUBLIC_URL="${PUBLIC_URL:-}"
KEEP=5; RELEASE="$(date -u +%Y%m%d_%H%M%S)"; BIN="$BACKEND_DIR/mcp-server-http-linux"

[ -f "$SERVER_KEY" ] || { echo "SSH key tidak ada: $SERVER_KEY" >&2; exit 1; }
PERM="$(stat -c '%a' "$SERVER_KEY" 2>/dev/null || stat -f '%Lp' "$SERVER_KEY")"
[ "$PERM" = "600" ] || { echo "Permission $SERVER_KEY = $PERM (harus 600)" >&2; exit 1; }
SSH_OPTS=(-i "$SERVER_KEY" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10 -o ServerAliveInterval=5 -o ServerAliveCountMax=3)
rsh() { ssh "${SSH_OPTS[@]}" "root@${SERVER_HOST}" "$@"; }

if [ "$BUILD" -eq 1 ]; then
  echo "==> [1/4] Build linux/amd64 (statis)"
  ( cd "$BACKEND_DIR" && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
      go build -trimpath -ldflags="-s -w" -o "$BIN" ./mcp-server/cmd-http )
else
  echo "==> [1/4] Skip build"
fi
[ -f "$BIN" ] || { echo "Binary tidak ada: $BIN" >&2; exit 1; }
echo "    $(du -h "$BIN" | cut -f1)  $BIN"

echo "==> [2/4] Upload ke ${INSTALL_DIR}/releases/${RELEASE}/"
rsh "test -d ${INSTALL_DIR}/releases" || { echo "Infra belum ada — jalankan Ansible --tags testify_mcp dulu" >&2; exit 1; }
PREV="$(rsh "readlink -f ${INSTALL_DIR}/current 2>/dev/null" || true)"
rsh "mkdir -p ${INSTALL_DIR}/releases/${RELEASE}"
scp "${SSH_OPTS[@]}" "$BIN" "root@${SERVER_HOST}:${INSTALL_DIR}/releases/${RELEASE}/mcp-server-http"
rsh "chown -R root:testify-mcp ${INSTALL_DIR}/releases/${RELEASE} && chmod 755 ${INSTALL_DIR}/releases/${RELEASE}/mcp-server-http"

echo "==> [3/4] Aktifkan release + restart ${SERVICE}"
rsh "ln -sfn ${INSTALL_DIR}/releases/${RELEASE} ${INSTALL_DIR}/current && systemctl restart ${SERVICE}"

echo "==> [4/4] Health check (MCP initialize di 127.0.0.1:${HTTP_PORT})"
INIT='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"deploy-check","version":"0"}}}'
ok=0
for _ in 1 2 3 4 5 6 7 8 9 10; do
  sleep 1
  OUT="$(rsh "curl -s -i -m 5 -X POST http://127.0.0.1:${HTTP_PORT}/mcp -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' -d '${INIT}'" || true)"
  if grep -q '^HTTP/[0-9.]* 200' <<<"$OUT" && grep -qi '^mcp-session-id:' <<<"$OUT"; then ok=1; break; fi
done
PANIC="$(rsh "journalctl -u ${SERVICE} --since '-2min' --no-pager | grep -ci panic" || true)"
if [ "$ok" -ne 1 ] || [ "${PANIC:-0}" != "0" ]; then
  echo "!! Health check GAGAL (ok=$ok, panic=${PANIC:-?}). Rollback." >&2
  if [ -n "$PREV" ]; then
    rsh "ln -sfn ${PREV} ${INSTALL_DIR}/current && systemctl restart ${SERVICE}" || true
    echo "   Dikembalikan ke ${PREV}" >&2
  else
    rsh "systemctl stop ${SERVICE}" || true
    echo "   Tidak ada release sebelumnya — service dihentikan. Cek: journalctl -u ${SERVICE} -n 50" >&2
  fi
  exit 1
fi

rsh "ls -1dt ${INSTALL_DIR}/releases/*/ | tail -n +$((KEEP + 1)) | xargs -r rm -rf"
echo "==> Selesai. Release ${RELEASE} aktif."
[ -n "$PUBLIC_URL" ] && echo "    URL MCP: ${PUBLIC_URL}"
