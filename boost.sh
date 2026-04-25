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
TARGET=1000

# Temporary packages (valid until April 30th, 2026)
CURRENT_DATE=$(date +%Y%m%d)
END_DATE=20260430

DIVINE_TARGET=0
EARN_TARGET=0

if [ "$CURRENT_DATE" -le "$END_DATE" ]; then
  DIVINE_TARGET=$((300 + RANDOM % 201))
  EARN_TARGET=$((300 + RANDOM % 201))
  echo "Temporary boost active until April 30th."
  echo "@divinedilibe/gm-dapp target: $DIVINE_TARGET"
  echo "@earnwithalee/stx-contract target: $EARN_TARGET"
fi

echo "Clearing global npm cache..."
npm cache clean --force

echo "Starting Download Boost"
echo "Target: $TARGET iterations"

while [ $COUNT -lt $TARGET ]; do
  dir=$(mktemp -d)
  cache_dir=$(mktemp -d)
  cd "$dir" || exit

  # Include all main packages to ensure each gets exactly 1000 downloads
  SELECTED_PACKAGES=("${PACKAGES[@]}")
  
  # Add temporary packages if they haven't reached their random targets
  if [ $COUNT -lt $DIVINE_TARGET ]; then
    SELECTED_PACKAGES+=("@divinedilibe/gm-dapp")
  fi
  
  if [ $COUNT -lt $EARN_TARGET ]; then
    SELECTED_PACKAGES+=("@earnwithalee/stx-contract")
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