#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if pm2 describe sudoku >/dev/null 2>&1; then
  pm2 stop sudoku
  pm2 save
fi
