#!/bin/bash
set -e

mkdir -p logs

echo "Splitting avalon-logs-all.json into individual game files..."

jq -r '.__collections__.logs | to_entries[] | "\(.key)\t\(.value | @json)"' avalon-logs-all.json | \
while IFS=$'\t' read -r filename json; do
  filepath="logs/${filename}"
  echo "$json" | jq '.' > "$filepath"
  echo "Created: $filepath"
done

echo "Done! Files created in logs/ directory"
