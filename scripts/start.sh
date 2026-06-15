#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

APP_NAME="sudoku-app"
PM2="./node_modules/.bin/pm2"

npm run build

if "$PM2" describe "$APP_NAME" >/dev/null 2>&1; then
  "$PM2" restart "$APP_NAME" --update-env
else
  "$PM2" start npm --name "$APP_NAME" -- start
fi
