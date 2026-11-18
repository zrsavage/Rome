#!/bin/sh
# The whole play-test audit, four battles at a time: sh tools/audit_all.sh [seeds]   (about 15-25 minutes)
# Then the screen audit: node tools/uiaudit.cjs
cd "$(dirname "$0")/.." || exit 1
OUT=$(mktemp -d)
seq 0 33 | xargs -P4 -I{} sh -c "JSONL=1 node tools/audit.mjs {} ${1:-1} > $OUT/{}.jsonl"
node tools/audit.mjs --report $OUT/*.jsonl
