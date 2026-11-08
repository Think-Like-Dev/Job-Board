#!/bin/sh
# Idempotent Garage bootstrap: single-node layout, bucket, and S3 key.
set -eu

GARAGE="/garage -c /etc/garage.toml"
BUCKET="${GARAGE_BUCKET:-jobboard-files}"
KEY_NAME="${GARAGE_KEY_NAME:-jobboard}"

echo "Waiting for Garage RPC..."
i=0
until $GARAGE node id -q >/dev/null 2>&1; do
  i=$((i + 1))
  if [ "$i" -gt 30 ]; then
    echo "Garage did not become ready in time" >&2
    exit 1
  fi
  sleep 2
done

# Assign the single node to a layout once. `status` prints NO ROLE ASSIGNED
# before the first assignment.
if $GARAGE status 2>&1 | grep -q "NO ROLE ASSIGNED"; then
  NODE_ID=$($GARAGE node id -q | cut -c1-16)
  echo "Assigning layout to node ${NODE_ID}..."
  $GARAGE layout assign "$NODE_ID" -z dc1 -c 10G
  $GARAGE layout apply --version 1
fi

if [ -n "${S3_ACCESS_KEY_ID:-}" ] && [ -n "${S3_SECRET_ACCESS_KEY:-}" ]; then
  echo "Importing S3 key ${KEY_NAME}..."
  $GARAGE key import --yes -n "$KEY_NAME" \
    "$S3_ACCESS_KEY_ID" "$S3_SECRET_ACCESS_KEY" >/dev/null 2>&1 || true
else
  echo "S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY are not set; skipping key import" >&2
fi

echo "Ensuring bucket ${BUCKET} exists..."
$GARAGE bucket create "$BUCKET" || true

echo "Granting ${KEY_NAME} access to ${BUCKET}..."
$GARAGE bucket allow --read --write --owner "$BUCKET" --key "$KEY_NAME" || true

echo "Garage initialised."
