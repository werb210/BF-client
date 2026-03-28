#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="client-app/src"

fetch_matches=$(rg "fetch\(" "$TARGET_DIR" -n || true)
fetch_count=$(echo "$fetch_matches" | sed '/^$/d' | wc -l | tr -d ' ')
if [[ "$fetch_count" != "0" ]]; then
  echo "❌ fetch() usage detected in $TARGET_DIR"
  echo "$fetch_matches"
  exit 1
fi

axios_matches=$(rg "axios.create" "$TARGET_DIR" -n || true)
axios_create_count=$(echo "$axios_matches" | sed '/^$/d' | wc -l | tr -d ' ')
if [[ "$axios_create_count" != "1" ]]; then
  echo "❌ Expected exactly 1 axios.create usage, found $axios_create_count"
  echo "$axios_matches"
  exit 1
fi

alert_matches=$(rg "alert\(" "$TARGET_DIR" -n || true)
alert_count=$(echo "$alert_matches" | sed '/^$/d' | wc -l | tr -d ' ')
if [[ "$alert_count" != "0" ]]; then
  echo "❌ alert() usage detected in $TARGET_DIR"
  echo "$alert_matches"
  exit 1
fi

echo "✅ Guardrail checks passed"
