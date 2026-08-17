# `just --list --unsorted`
default:
    @just --list --unsorted

# `vp install`
install:
    vp install

# Download a specific log document by ID
[arg("DOC_ID", long="doc-id", help="Google document ID")]
download DOC_ID:
    #!/usr/bin/env bash
    set -Eeuo pipefail
    # Create logs directory
    mkdir -p logs
    # Download the document using the third-party tool
    echo "Downloading document: {{ DOC_ID }}"
    vp dlx --package node-firestore-import-export \
        firestore-export \
        --accountCredentials ~/projects/avalon-online/server/georgyo-avalon-firebase-adminsdk-uewf3-bf74e6c4c1.json \
        --backupFile "logs/{{ DOC_ID }}" \
        --nodePath "logs/{{ DOC_ID }}" \
        --prettyPrint
    echo "Saved to logs/{{ DOC_ID }}"

# Run the test suite
test: install
    vp test run --passWithNoTests

# `vp run typecheck:ci`
typecheck: install
    vp run typecheck:ci

# `vp lint --fix`
lint: install
    vp lint --fix

# `pre-commit run --all-files`
pre-commit: install
    pre-commit run --all-files

# Run all pre-commit checks
precommit: typecheck lint test pre-commit

# Fetch all avalon logs from Firestore
fetch-logs:
    node fetch-new-logs.js

all: fetch-logs
