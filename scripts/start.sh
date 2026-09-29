#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f ".next/BUILD_ID" ]; then
  /home/krazyeom/.nvm/versions/node/v20.19.6/bin/node node_modules/next/dist/bin/next build
fi

if pm2 describe sudoku >/dev/null 2>&1; then
  pm2 restart sudoku
else
  pm2 start ecosystem.config.cjs
fi
pm2 save
