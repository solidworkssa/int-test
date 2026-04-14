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
  "@winsznx/stx-canvas-client"
  "@winsznx/stacks-wrapped-parser"
  "@winsznx/stxpet-core"
)

COUNT=0
TARGET=715 # 14-day split to reach 10,000 total

echo "Clearing global npm cache..."
npm cache clean --force

echo "Starting Daily Download Boost for ${#PACKAGES[@]} packages"
echo "Target: $TARGET iterations for today"

while [ $COUNT -lt $TARGET ]; do
  dir=$(mktemp -d)
  cache_dir=$(mktemp -d)

  cd "$dir" || exit

  # Target NPM specifically
  npm pack "${PACKAGES[@]}" \
    --userconfig /dev/null \
    --globalconfig /dev/null \
    --registry "https://registry.npmjs.org/" \
    --cache "$cache_dir" \
    --force \
    --loglevel silent 2>/dev/null

  # Target GitHub specifically
  npm pack "${PACKAGES[@]}" \
    --cache "$cache_dir" \
    --force \
    --loglevel silent 2>/dev/null
    
  cd - >/dev/null || exit

  rm -rf "$dir" "$cache_dir"
  COUNT=$((COUNT + 1))
  
  # Organic sleep jitter between 1 and 3 seconds
  SLEEP_TIME=$((1 + RANDOM % 3))
  echo "[$COUNT/$TARGET] Downloaded packages. Resting for ${SLEEP_TIME}s..."
  sleep $SLEEP_TIME
done

echo "🎉 Daily organic boost complete."