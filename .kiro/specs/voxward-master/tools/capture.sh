#!/bin/bash
# Capture lessons.json entries as project knowledge cards.
# Usage: capture.sh <lessons.json> <keyPrefix> [onlyIndex]
L="$1"; P="$2"; ONLY="$3"
W="/home/ryanlan/GoogleDrive/Cloud Workspace/Ether"
H=kiro
N=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1])).length)' "$L")
get() { node -e 'const l=JSON.parse(require("fs").readFileSync(process.argv[1]))[+process.argv[2]];const v=l[process.argv[3]];console.log(Array.isArray(v)?v.join(","):v)' "$L" "$1" "$2"; }
for ((i=0; i<N; i++)); do
  [ -n "$ONLY" ] && [ "$i" != "$ONLY" ] && continue
  refs=$(node -e 'const l=JSON.parse(require("fs").readFileSync(process.argv[1]))[+process.argv[2]];console.log(l.sources.references.map(r=>l.sources.projectId+":"+r).join(","))' "$L" "$i")
  node "$HOME/.einzbern/engine/einzbern.mjs" knowledge-capture --workspace "$W" --at "$(date -u +%FT%TZ)" \
    --host "$H" --scope project --project-id project:f824c7861e6888255132af42 --accountable-owner-id owner:governance \
    --external-key "$P-$((i+1))" --coexist true \
    --subject "$(get $i subject)" --summary "$(get $i summary)" --snippet "$(get $i snippet)" --body "$(get $i body)" \
    --tags "$(get $i tags)" --source-references "$refs" 2>&1 \
    | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);console.log(j.reasonCode,j.id||"",(j.error||"").slice(0,160))}catch(e){console.log(s.slice(0,200))}})'
done
