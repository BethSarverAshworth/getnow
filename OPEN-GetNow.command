#!/bin/bash
# Double-click this file to open GetNow on your Mac.
# Prefer the live site; also start a local backup on port 8080.

cd "$(dirname "$0")" || exit 1

LIVE="https://getnow-app.vercel.app/"
LOCAL="http://127.0.0.1:8080/"

# Always open the live (hosted) site first — this is the real product URL
open "$LIVE" 2>/dev/null || true

# Start local server if nothing is already listening on 8080
if ! lsof -iTCP:8080 -sTCP:LISTEN >/dev/null 2>&1; then
  # Open local backup after a short delay so the server is ready
  (
    sleep 0.6
    open "$LOCAL" 2>/dev/null || true
  ) &
  echo "GetNow live:  $LIVE"
  echo "GetNow local: $LOCAL"
  echo "Press Ctrl+C to stop the local server."
  python3 -m http.server 8080
else
  echo "Port 8080 already in use — opening live + existing local."
  open "$LOCAL" 2>/dev/null || true
  echo "GetNow live:  $LIVE"
  echo "GetNow local: $LOCAL"
  # Keep Terminal window open briefly so you can read the URLs
  sleep 3
fi
