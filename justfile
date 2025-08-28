# `just --list --unsorted`
default:
    @just --list --unsorted

# `npm install`
install:
    npm install

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
    ./fetch-avalon-logs-all.sh

# Split the large avalon-logs-all.json file into individual game files
split-logs:
    ./split-logs.sh

all: fetch-logs split-logs
