#!/usr/bin/env bash
set -euo pipefail

TUNNEL_NAME="${TUNNEL_NAME:-my-tunnel}"
ENGINE_PORT="${ENGINE_PORT:-7291}"
ENGINE_HOST="p${ENGINE_PORT}.benlabtest.space"
CONFIG="${CLOUDFLARED_CONFIG:-$HOME/.cloudflared/config.yml}"

echo "Tunnel:  $TUNNEL_NAME"
echo "Engine:  https://$ENGINE_HOST -> localhost:$ENGINE_PORT"
echo "Config:  $CONFIG"
echo ""

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared not found. Install: brew install cloudflared"
  exit 1
fi

if [[ ! -f "$CONFIG" ]]; then
  echo "Missing $CONFIG"
  exit 1
fi

cloudflared tunnel ingress validate "$CONFIG"

echo "Registering DNS route..."
cloudflared tunnel route dns "$TUNNEL_NAME" "$ENGINE_HOST"

echo ""
echo "Done. Start the tunnel when ready:"
echo "  cloudflared tunnel run $TUNNEL_NAME"
