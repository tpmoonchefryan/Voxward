#!/bin/bash
# Fetch live work-show for the given external keys into <outDir> and print status/revision/problems.
# Usage: show-keys.sh <outDir> KEY...
out="$1"; shift
mkdir -p "$out"
W="/home/ryanlan/GoogleDrive/Cloud Workspace/Ether"
printf '%s\n' "$@" | xargs -P 6 -I{} sh -c \
  "node \"$HOME/.einzbern/engine/einzbern.mjs\" work-show --workspace \"$W\" --external-key {} > \"$out/{}.json\" 2>&1"
for k in "$@"; do
  node -e 'const j=JSON.parse(require("fs").readFileSync(process.argv[1]));console.log(j.record.externalKey,j.record.status,"rev",j.record.revision,"problems",JSON.stringify(j.workContent.structureProblems))' "$out/$k.json"
done
