#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PORT:-6767}"
PID_FILE="$ROOT/.sudoku-server.pid"
LOG_DIR="$ROOT/logs"
LOG_FILE="$LOG_DIR/server.log"

mkdir -p "$LOG_DIR"
cd "$ROOT"

if [[ -f "$PID_FILE" ]]; then
  PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [[ -n "${PID:-}" ]] && kill -0 "$PID" 2>/dev/null; then
    echo "Sudoku server already running (pid $PID)"
    exit 0
  fi
  rm -f "$PID_FILE"
fi

EXISTING_PID="$(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)"
if [[ -n "$EXISTING_PID" ]]; then
  echo "Stopping existing listener on port $PORT (pid $EXISTING_PID)"
  kill "$EXISTING_PID" 2>/dev/null || true
  for _ in {1..10}; do
    if ! lsof -tiTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done
fi

npm run build
NODE_ENV=production PORT="$PORT" nohup node server.mjs >> "$LOG_FILE" 2>&1 &
SERVER_PID=$!
echo "$SERVER_PID" > "$PID_FILE"
echo "Started Sudoku server (pid $SERVER_PID) on port $PORT"
