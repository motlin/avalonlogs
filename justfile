# `just --list --unsorted`
default:
    @just --list --unsorted

# `npm install`
install:
    npm install

# `npm run ci:typecheck`
typecheck: install
    npm run ci:typecheck

# `pre-commit run --all-files`
pre-commit: install
    pre-commit run --all-files

# Run all pre-commit checks
precommit: typecheck pre-commit

# Download a specific log document by ID
download DOC_ID:
    #!/usr/bin/env bash
    set -Eeuo pipefail
    # Create logs directory
    mkdir -p logs
    # Download the document using the third-party tool
    echo "Downloading document: {{DOC_ID}}"
    npx --package node-firestore-import-export \
        firestore-export \
        --accountCredentials ~/projects/avalon-online/server/georgyo-avalon-firebase-adminsdk-uewf3-bf74e6c4c1.json \
        --backupFile "logs/{{DOC_ID}}" \
        --nodePath "logs/{{DOC_ID}}" \
        --prettyPrint
    echo "Saved to logs/{{DOC_ID}}"

# Fetch all avalon logs from Firestore
fetch-logs:
    node fetch-new-logs.js

all: fetch-logs
