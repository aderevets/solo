#!/bin/bash
set -eo pipefail

BUILDS_URL="https://builds.hedera.com/?prefix=node/software/"

echo "Fetching CN build listing from ${BUILDS_URL}..." >&2
XML=$(curl -sf "${BUILDS_URL}")

# The response is a single-line XML. Split on '<' so each tag becomes its own
# line, then use awk (FS='>') to extract Key and LastModified values.
# Only .sha384 files are considered (one per release, small marker file).
LATEST=$(printf '%s' "${XML}" | tr '<' '\n' | awk -F'>' '
  /^Key/ && $2 ~ /^node\/software\/[^\/]+\/build-v[^\/]+\.sha384$/ {
    key = $2
  }
  /^LastModified/ && key != "" {
    print $2, key
    key = ""
  }
' | sort -r | head -1)

if [[ -z "${LATEST}" ]]; then
  echo "ERROR: no node/software build entries found at ${BUILDS_URL}" >&2
  exit 1
fi

KEY=$(awk '{print $2}' <<< "${LATEST}")

# node/software/v0.74/build-v0.74.0-rc.1.sha384  ->  v0.74.0-rc.1
VERSION=$(sed -E 's|.*/build-(.+)\.sha384$|\1|' <<< "${KEY}")

if [[ -z "${VERSION}" ]]; then
  echo "ERROR: could not extract version from key: ${KEY}" >&2
  exit 1
fi

echo "Latest CN version: ${VERSION}  (key: ${KEY})" >&2
echo "${VERSION}"
