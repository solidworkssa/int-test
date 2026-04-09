#!/bin/bash

PACKAGES=(
  "@winsznx/lend402"
  "@winsznx/sdk"
  "@winsznx/react"
  "@winsznx/stacks-utils"
  "@winsznx/streakbit-sdk"
  "@winsznx/stxactcli"
  "@winsznx/saturnsdk"
  "@winsznx/fundsdk"
)

COUNT=0
TARGET=10000

echo "Clearing global npm cache..."
npm cache clean --force

echo "Starting download boost for ${#PACKAGES[@]} packages"
echo "Target: $TARGET iterations (~$(($TARGET * ${#PACKAGES[@]})) total downloads)"

while [ $COUNT -lt $TARGET ]; do
  dir=$(mktemp -d)
  cache_dir=$(mktemp -d)

  echo "Iteration $((COUNT + 1)) - Fetching ${#PACKAGES[@]} packages (NPM & GitHub)..."
  cd "$dir"

  # Target NPM specifically
  npm pack "${PACKAGES[@]}" \
    --userconfig /dev/null \
    --globalconfig /dev/null \
    --registry "https://registry.npmjs.org/" \
    --cache "$cache_dir" \
    --force \
    --loglevel silent 2>/dev/null

  # Target GitHub specifically (uses ~/.npmrc mapping)
  npm pack "${PACKAGES[@]}" \
    --cache "$cache_dir" \
    --force \
    --loglevel silent 2>/dev/null
  cd - >/dev/null

  rm -rf "$dir" "$cache_dir"
  COUNT=$((COUNT + 1))
  echo "[$COUNT/$TARGET] installed all ${#PACKAGES[@]} packages"
  sleep 2
done

echo "Done. ~$((COUNT * ${#PACKAGES[@]})) total downloads generated."
