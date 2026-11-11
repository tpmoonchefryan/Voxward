#!/bin/bash
# Runs one command under the outbound guard and the kiro shims. The guard self-check runs first, in the same
# environment, and the command runs only when the self-check confirms the guard is loaded and refuses every real host.
# Usage: guarded.sh <logDir> <command> [args...]
# EXTRA_NODE_OPTIONS adds Node options (for example --expose-gc) after the guard import.
W="$(cd "$(dirname "$0")" && pwd)"
L="$1"; shift
mkdir -p "$L/net"
: > "$L/shim.log"
export PATH="$W/shim:$PATH"
export PROBE_SHIM_LOG="$L/shim.log"
export PROBE_NET_LOG_DIR="$L/net"
export PROBE_DENY_PORTS="$(cat "$W/logs/deny-ports.txt")"
export NODE_OPTIONS="--import=$W/net/preload.mjs ${EXTRA_NODE_OPTIONS:-}"
if ! node "$W/net/selfcheck.mjs" > "$L/selfcheck.txt" 2>&1; then
  echo "guarded: self-check failed, command not run" >&2
  cat "$L/selfcheck.txt" >&2
  exit 90
fi
# The self-check's own refused attempts are kept apart from the command's records.
mkdir -p "$L/net-selfcheck"
mv "$L"/net/net-*.jsonl "$L/net-selfcheck/" 2>/dev/null
"$@"
