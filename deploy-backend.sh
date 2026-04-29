#!/usr/bin/env bash
# Deploy backend/ to the production server.
#
# Mirrors the local backend/ directory to /home/pcrm/backend/ on the
# Hetzner host, then bounces the pm2 process. Excludes server-only
# state so the deploy never overwrites secrets or live data:
#   .env          — server-side secrets (PCRM_API_SECRET, N8N_*)
#   data/         — live JSON state (campaigns.json, leads.json)
#   node_modules/ — installed on the server, platform-specific
#   .DS_Store / *.log — local junk
#
# Usage: ./deploy-backend.sh
#
# Override the destination by setting env vars before running:
#   SSH_KEY=~/.ssh/other_key SSH_HOST=root@1.2.3.4 ./deploy-backend.sh

set -euo pipefail

SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519_hetzner}"
SSH_HOST="${SSH_HOST:-root@178.104.168.218}"
REMOTE_DIR="${REMOTE_DIR:-/home/pcrm/backend/}"
PM2_APP="${PM2_APP:-pcrm-backend}"

if [[ ! -d backend ]]; then
  echo "error: backend/ not found in $(pwd)" >&2
  echo "run this script from the project root" >&2
  exit 1
fi

if [[ ! -f "$SSH_KEY" ]]; then
  echo "error: ssh key not found at $SSH_KEY" >&2
  exit 1
fi

echo "→ rsync  backend/  →  $SSH_HOST:$REMOTE_DIR"
rsync -avz \
  --exclude='.env' \
  --exclude='data/' \
  --exclude='node_modules/' \
  --exclude='.DS_Store' \
  --exclude='*.log' \
  -e "ssh -i $SSH_KEY" \
  backend/ "$SSH_HOST:$REMOTE_DIR"

echo
echo "→ pm2 restart $PM2_APP"
ssh -i "$SSH_KEY" "$SSH_HOST" "pm2 restart $PM2_APP"

echo
echo "✓ deploy complete"
