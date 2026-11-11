#!/bin/bash
# Default-config startup smoke: pnpm dev and bundled node dist/main.js, /healthz on 127.0.0.1:3000.
# Usage: smoke.sh <checkoutDir> <logDir>
D="$1"; O="$2"
[ -d "$D/apps/server" ] || { echo "smoke: checkout not found: $D" >&2; exit 2; }
if ss -ltn | grep -qE '127.0.0.1:(3000|5173)\b'; then echo "smoke: port 3000/5173 already in use; refusing" >&2; ss -ltnp | grep -E ':3000|:5173' >&2; exit 3; fi
mkdir -p "$O"
probe() {
  local name="$1" dir="$2"; shift 2
  (cd "$dir" && exec setsid "$@" > "$O/smoke-$name.log" 2>&1) &
  local pid=$!
  local ok=0 code=000 i
  for i in $(seq 1 40); do
    sleep 1
    code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/healthz)
    if [ "$code" = 200 ]; then ok=1; break; fi
  done
  echo "$name healthz ok=$ok code=$code after ${i}s"
  kill -- -"$pid" 2>/dev/null
  sleep 2
}
probe dev "$D" pnpm dev
# Production start requires VOXWARD_ADAPTERS by design (batch 1 acceptance N8).
probe dist "$D/apps/server" env VOXWARD_ADAPTERS=synthetic node dist/main.js
ss -ltn | grep -E ':3000|:5173' || echo "no listeners"
