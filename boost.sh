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
  # NOTE: Update these prefixes if you published them under @solidworkssa
  "@winsznx/stx-canvas-client" 
  "@winsznx/stacks-wrapped-parser"
  "@winsznx/stxpet-core"
)

COUNT=0
# 1. DAILY RANDOMNESS: Target between 500 and 800 runs per day
TARGET=$((500 + RANDOM % 301)) 

echo "Clearing global npm cache..."
npm cache clean --force

echo "Starting Daily Organic Download Boost"
echo "Target: $TARGET iterations for today"

while [ $COUNT -lt $TARGET ]; do
  dir=$(mktemp -d)
  cache_dir=$(mktemp -d)
  cd "$dir" || exit

  # 2. PACKAGE RANDOMNESS: 90% chance for each package to be included in this specific loop
  # This guarantees no two packages finish the day with the exact same download count.
  SELECTED_PACKAGES=()
  for pkg in "${PACKAGES[@]}"; do
    if [ $((RANDOM % 100)) -lt 90 ]; then
      SELECTED_PACKAGES+=("$pkg")
    fi
  done

  # Fallback just in case the randomizer skips all of them
  if [ ${#SELECTED_PACKAGES[@]} -eq 0 ]; then
    SELECTED_PACKAGES=("${PACKAGES[0]}")
  fi

  # Target NPM specifically
  npm pack "${SELECTED_PACKAGES[@]}" \
    --userconfig /dev/null \
    --globalconfig /dev/null \
    --registry "https://registry.npmjs.org/" \
    --cache "$cache_dir" \
    --force \
    --loglevel silent 2>/dev/null

  # Target GitHub specifically
  npm pack "${SELECTED_PACKAGES[@]}" \
    --cache "$cache_dir" \
    --force \
    --loglevel silent 2>/dev/null
    
  cd - >/dev/null || exit

  rm -rf "$dir" "$cache_dir"
  COUNT=$((COUNT + 1))
  
  # Organic sleep jitter between 1 and 4 seconds
  SLEEP_TIME=$((1 + RANDOM % 4))
  echo "[$COUNT/$TARGET] Downloaded ${#SELECTED_PACKAGES[@]} packages. Resting for ${SLEEP_TIME}s..."
  sleep $SLEEP_TIME
done

echo "🎉 Daily organic boost complete. Target of $TARGET met."