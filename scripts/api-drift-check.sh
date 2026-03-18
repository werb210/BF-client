#!/usr/bin/env bash
set -euo pipefail

echo "---------------------------------"
echo "Boreal API Drift Diagnostic"
echo "---------------------------------"

WORKDIR=$(pwd)

SERVER_DIR_DEFAULT="../BF-Server"
PORTAL_DIR_DEFAULT="../Staff-Portal"
CLIENT_DIR_DEFAULT="$WORKDIR/client-app"

SERVER_DIR="${SERVER_DIR:-$SERVER_DIR_DEFAULT}"
PORTAL_DIR="${PORTAL_DIR:-$PORTAL_DIR_DEFAULT}"
CLIENT_DIR="${CLIENT_DIR:-$CLIENT_DIR_DEFAULT}"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

SERVER_ROUTES="$TMP_DIR/server-routes.txt"
PORTAL_CALLS="$TMP_DIR/portal-calls.txt"
CLIENT_CALLS="$TMP_DIR/client-calls.txt"

touch "$SERVER_ROUTES" "$PORTAL_CALLS" "$CLIENT_CALLS"

extract_api_paths() {
  local source_dir="$1"
  local output_file="$2"
  local label="$3"

  if [[ ! -d "$source_dir" ]]; then
    echo "WARN: $label directory missing: $source_dir"
    return 0
  fi

  rg "/api/" "$source_dir" \
    | sed -nE 's/.*"(\/api[^"]+)".*/\1/p' \
    | sort -u > "$output_file" || true
}

echo ""
echo "Extracting server routes..."

extract_api_paths "$SERVER_DIR/src" "$SERVER_ROUTES" "Server"

echo ""
echo "Extracting portal API calls..."

extract_api_paths "$PORTAL_DIR/src" "$PORTAL_CALLS" "Portal"

echo ""
echo "Extracting client API calls..."

extract_api_paths "$CLIENT_DIR/src" "$CLIENT_CALLS" "Client"

if [[ ! -s "$SERVER_ROUTES" ]]; then
  echo "WARN: No server routes found. Drift comparison may be incomplete."
fi

echo ""
echo "---------------------------------"
echo "PORTAL CALLS NOT IN SERVER"
echo "---------------------------------"

comm -23 "$PORTAL_CALLS" "$SERVER_ROUTES" || true

echo ""
echo "---------------------------------"
echo "CLIENT CALLS NOT IN SERVER"
echo "---------------------------------"

comm -23 "$CLIENT_CALLS" "$SERVER_ROUTES" || true

echo ""
echo "---------------------------------"
echo "DONE"
echo "---------------------------------"
