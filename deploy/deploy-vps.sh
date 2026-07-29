#!/usr/bin/env bash
#
# Deploy Testify (landing + React/Vite SPA + Astro/Starlight docs) ke server.
# Tiga output statis di-build lokal lalu di-rsync ke SATU release directory di
# server, baru diaktifkan lewat satu symlink swap atomik:
#   - landing/          -> root release (domain root, /)
#   - frontend/dist/     -> release/app/   (React SPA, base: '/app/')
#   - public-docs/dist/  -> release/docs/  (Astro/Starlight, base: '/docs/')
#
# Backend adalah Supabase (BaaS) yang diakses langsung dari browser -- tidak
# ada proses server-side untuk app ini, sehingga .env
# (VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY) di-bake ke dalam hasil
# `npm run build` saat build lokal, BUKAN disimpan di server.
#
# Jalankan dari root project ini, dari shell apa saja yang punya
# bash+ssh+rsync native (WSL, Git Bash, macOS, Linux):
#
#   bash deploy/deploy-vps.sh
#     -> skip npm ci & skip build sama sekali (default) -- langsung rsync
#        frontend/dist/ dan public-docs/dist/ yang SUDAH ADA hasil build
#        sebelumnya. landing/ tidak pernah butuh build (statis apa adanya).
#
#   bash deploy/deploy-vps.sh --build
#     -> npm run build di frontend/ DAN public-docs/ (tanpa npm ci -- pakai
#        node_modules lokal yang sudah ada), baru rsync semua.
#
#   bash deploy/deploy-vps.sh --install --build
#     -> npm ci && npm run build di frontend/ DAN public-docs/, baru rsync
#        semua. Dipakai kalau dependency berubah.
#
# Server tidak butuh Node.js/npm sama sekali -- build 100% di lokal/CI,
# server hanya menerima hasil build statis (mirip arsitektur deploy Laravel
# app lain di repo ini: build di luar, server cuma serve artifact).
#
# Prasyarat:
#   - Shell dengan rsync + ssh tersedia (WSL, Git Bash dengan usr/bin di
#     PATH, macOS, atau Linux manapun).
#   - Key ~/.ssh/shiftech_server1 (root/Ansible -- lihat
#     shiftech-server1/CLAUDE.md "Manajemen SSH Key") dengan permission 600.
#     Kalau key ini disalin dari Windows (mis. lewat /mnt/c/... di WSL),
#     permission NTFS-nya biasanya 777 dan akan DITOLAK ssh -- copy dulu ke
#     home directory Linux native lalu `chmod 600`.
#   - Struktur /var/www/testify/releases sudah di-provision Ansible
#     (role app, type: spa) sebelum deploy pertama kali dijalankan.
#   - File deploy/deploy.conf.local berisi SERVER_HOST (dan opsional
#     SERVER_KEY/APP_NAME) -- copy dari deploy/deploy.conf.example. File
#     .local ini di-gitignore supaya IP/host server tidak terpublikasi.

set -euo pipefail

SKIP_INSTALL=1
SKIP_BUILD=1
for arg in "$@"; do
    case "$arg" in
        --install) SKIP_INSTALL=0 ;;
        --build) SKIP_BUILD=0 ;;
        *)
            echo "Argumen tidak dikenal: $arg (pakai --install / --build)" >&2
            exit 1
            ;;
    esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
FRONTEND_DIR="${PROJECT_DIR}/frontend"
LANDING_DIR="${PROJECT_DIR}/landing"
DOCS_DIR="${PROJECT_DIR}/public-docs"

CONFIG_FILE="${SCRIPT_DIR}/deploy.conf.local"
if [ ! -f "$CONFIG_FILE" ]; then
    echo "Config tidak ditemukan: $CONFIG_FILE -- copy dari deploy/deploy.conf.example dan isi SERVER_HOST." >&2
    exit 1
fi
# shellcheck source=/dev/null
source "$CONFIG_FILE"

SERVER_HOST="${SERVER_HOST:?SERVER_HOST harus diisi di $CONFIG_FILE}"
SERVER_KEY="${SERVER_KEY:-${HOME}/.ssh/shiftech_server1}"
APP_NAME="${APP_NAME:-testify}"
APP_DIR="/var/www/${APP_NAME}"
RELEASE="$(date -u +%Y%m%d_%H%M%S)"
KEEP_RELEASES=5

if [ ! -f "$SERVER_KEY" ]; then
    echo "SSH key tidak ditemukan: $SERVER_KEY" >&2
    exit 1
fi
KEY_PERM="$(stat -c '%a' "$SERVER_KEY" 2>/dev/null || stat -f '%Lp' "$SERVER_KEY")"
if [ "$KEY_PERM" != "600" ]; then
    echo "Permission SSH key $SERVER_KEY = $KEY_PERM (harus 600). Kalau key ini di-mount dari Windows (mis. /mnt/c/...), copy dulu ke home directory native lalu chmod 600." >&2
    exit 1
fi

SSH_OPTS=(-i "$SERVER_KEY" -o StrictHostKeyChecking=no -o ConnectTimeout=10 -o ServerAliveInterval=5 -o ServerAliveCountMax=3)

invoke_ssh() {
    echo "    [ssh] $1"
    ssh "${SSH_OPTS[@]}" "root@${SERVER_HOST}" "$1"
    echo "    [ssh] selesai"
}

if [ "$SKIP_BUILD" -eq 1 ]; then
    echo "==> [1/5] Skip build (tanpa --build) -- pakai frontend/dist/ dan public-docs/dist/ yang sudah ada"
else
    echo "==> [1/5] Build lokal (frontend/ dan public-docs/)"
    cd "$FRONTEND_DIR"
    if [ "$SKIP_INSTALL" -eq 1 ]; then
        echo "    frontend: skip npm ci (tanpa --install)"
    else
        echo "    frontend: npm ci"
        npm ci
    fi
    echo "    frontend: npm run build"
    npm run build

    cd "$DOCS_DIR"
    if [ "$SKIP_INSTALL" -eq 1 ]; then
        echo "    public-docs: skip npm ci (tanpa --install)"
    else
        echo "    public-docs: npm ci"
        npm ci
    fi
    echo "    public-docs: npm run build"
    npm run build
fi

if [ ! -f "${FRONTEND_DIR}/dist/index.html" ]; then
    echo "frontend/dist/index.html tidak ditemukan -- build gagal, atau (tanpa --build) belum pernah di-build sama sekali" >&2
    exit 1
fi
if [ ! -f "${DOCS_DIR}/dist/index.html" ]; then
    echo "public-docs/dist/index.html tidak ditemukan -- build gagal, atau (tanpa --build) belum pernah di-build sama sekali" >&2
    exit 1
fi
if [ ! -f "${LANDING_DIR}/index.html" ]; then
    echo "landing/index.html tidak ditemukan -- landing/ hilang atau rusak" >&2
    exit 1
fi

echo "==> [2/5] Cari release sebelumnya buat incremental --link-dest"
PREV_RELEASE="$(ssh "${SSH_OPTS[@]}" "root@${SERVER_HOST}" "readlink -f ${APP_DIR}/current 2>/dev/null" || true)"
LINK_DEST_APP=""
LINK_DEST_DOCS=""
if [ -n "$PREV_RELEASE" ] && [ "$PREV_RELEASE" != "${APP_DIR}/releases/${RELEASE}" ] && ssh "${SSH_OPTS[@]}" "root@${SERVER_HOST}" "test -d '${PREV_RELEASE}'"; then
    LINK_DEST_APP="--link-dest=${PREV_RELEASE}/app/"
    LINK_DEST_DOCS="--link-dest=${PREV_RELEASE}/docs/"
    echo "    Previous release: ${PREV_RELEASE}"
else
    echo "    Tidak ada release sebelumnya -- full rsync"
fi

echo "==> [3/5] Buat direktori release baru di server"
invoke_ssh "mkdir -p ${APP_DIR}/releases/${RELEASE}/app ${APP_DIR}/releases/${RELEASE}/docs"

echo "==> [4/5] Rsync hasil build -> release baru"
# --delete aman di sini -- setiap release adalah folder baru yang belum
# pernah diisi apa pun sebelumnya (bukan staging persisten yang dipakai
# ulang tiap deploy seperti app Laravel), jadi tidak ada risiko menghapus
# sesuatu yang masih dibutuhkan. Tiga rsync terpisah ke subpath berbeda dari
# release yang sama -- masing-masing --delete hanya berlaku di subpath-nya
# sendiri, tidak saling menghapus.
RSYNC_OPTS=(-rlt --delete --no-perms --no-owner --no-group --compress-level=1 --itemize-changes --human-readable -e "ssh ${SSH_OPTS[*]}")

echo "    landing/ -> release root"
rsync "${RSYNC_OPTS[@]}" \
    "${LANDING_DIR}/" \
    "root@${SERVER_HOST}:${APP_DIR}/releases/${RELEASE}/"

echo "    frontend/dist/ -> release/app/ (link-dest: ${PREV_RELEASE:-none})"
rsync "${RSYNC_OPTS[@]}" ${LINK_DEST_APP:+"$LINK_DEST_APP"} \
    "${FRONTEND_DIR}/dist/" \
    "root@${SERVER_HOST}:${APP_DIR}/releases/${RELEASE}/app/"

echo "    public-docs/dist/ -> release/docs/ (link-dest: ${PREV_RELEASE:-none})"
rsync "${RSYNC_OPTS[@]}" ${LINK_DEST_DOCS:+"$LINK_DEST_DOCS"} \
    "${DOCS_DIR}/dist/" \
    "root@${SERVER_HOST}:${APP_DIR}/releases/${RELEASE}/docs/"

echo "==> [5/5] Aktifkan release (symlink current) & bersihkan release lama"
POST_DEPLOY_SCRIPT="$(cat <<EOF
set -e
APP=${APP_DIR}/releases/${RELEASE}
chown -R deployer:deployer \$APP
ln -sfn \$APP ${APP_DIR}/current
ls -1dt ${APP_DIR}/releases/*/ | tail -n +$((KEEP_RELEASES + 1)) | xargs -r rm -rf
EOF
)"
ssh "${SSH_OPTS[@]}" "root@${SERVER_HOST}" "bash -s" <<< "$POST_DEPLOY_SCRIPT"

echo "==> Selesai. Verifikasi:"
echo "    https://testify.apps.shiftech.my.id/"
echo "    https://testify.apps.shiftech.my.id/app/"
echo "    https://testify.apps.shiftech.my.id/docs/"
