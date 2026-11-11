#!/bin/bash
# Restarts the acceptance harness on a fresh scratch database. The Vite dev server keeps running.
W="$KIROCREW_SCRATCH/vw-accept-b5a-work"; C="$KIROCREW_SCRATCH/vw-int-b5a"
for pid in $(ss -ltnpH 'sport = :3000 or sport = :3901' | grep -o 'pid=[0-9]*' | cut -d= -f2 | sort -u); do kill "$pid" 2>/dev/null; done
for i in $(seq 1 50); do ss -ltnH 'sport = :3000 or sport = :3901' | grep -q . || break; sleep 0.2; done
rm -f "$W"/e40/viewer.sqlite3* "$W/harness-seed.json"
cd "$C/apps/server" && setsid ./node_modules/.bin/tsx "$W/harness.mts" "$C" "$W" "$W/e40/viewer.sqlite3" 3000 3901 > "$W/e40/harness.log" 2>&1 < /dev/null &
for i in $(seq 1 100); do grep -q 'harness ready' "$W/e40/harness.log" 2>/dev/null && break; sleep 0.3; done
cat "$W/e40/harness.log"
