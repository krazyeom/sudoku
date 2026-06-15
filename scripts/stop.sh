#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

APP_NAME="sudoku-app"
PM2="./node_modules/.bin/pm2"

if "$PM2" describe "$APP_NAME" >/dev/null 2>&1; then
  "$PM2" delete "$APP_NAME"
else
  echo "$APP_NAME is not running."
fi
