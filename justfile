# `just --list --unsorted`
default:
    @just --list --unsorted

# `vp install`
install:
    vp install

# Run the test suite
test: install
    vp test run

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

# Fetch new logs from every configured server into logs/<server>/
fetch-logs:
    node fetch-new-logs.js

# List the logs that would be fetched, without downloading them
fetch-logs-dry-run:
    node fetch-new-logs.js --dry-run

# Fetch new logs from a single server
[arg("SOURCE", long="source", help="Server to fetch from: georgyo-avalon or avalon-cool")]
fetch-logs-from SOURCE:
    node fetch-new-logs.js --source {{ SOURCE }}

# Download a specific log document by ID
[arg("SOURCE", long="source", help="Server to download from: georgyo-avalon or avalon-cool")]
[arg("DOC_ID", long="doc-id", help="Firestore document ID")]
download SOURCE DOC_ID:
    #!/usr/bin/env bash
    set -Eeuo pipefail
    case "{{ SOURCE }}" in
        georgyo-avalon)
            CREDENTIALS=~/projects/avalon-online/server/georgyo-avalon-firebase-adminsdk-uewf3-bf74e6c4c1.json
            ;;
        avalon-cool)
            CREDENTIALS=~/projects/avalon-online/server/firebase-key.json
            ;;
        *)
            echo "Unknown server: {{ SOURCE }} (expected georgyo-avalon or avalon-cool)" >&2
            exit 1
            ;;
    esac
    mkdir -p "logs/{{ SOURCE }}"
    echo "Downloading document: {{ DOC_ID }}"
    # --nodePath is the path inside Firestore; --backupFile is the local destination.
    vp dlx --package node-firestore-import-export \
        firestore-export \
        --accountCredentials "$CREDENTIALS" \
        --backupFile "logs/{{ SOURCE }}/{{ DOC_ID }}" \
        --nodePath "logs/{{ DOC_ID }}" \
        --prettyPrint
    echo "Saved to logs/{{ SOURCE }}/{{ DOC_ID }}"

all: fetch-logs
