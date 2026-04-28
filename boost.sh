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
  "@winsznx/petsdk"
  "@winsznx/streaksdk"
  "@winsznx/klocksdk"
  "@winsznx/wrappedsdk"
  "@winsznx/pixsdk"
)

COUNT=0
WINSZNX_TARGET=$((5000 + RANDOM % 2001))
TARGET=$WINSZNX_TARGET

# Temporary packages (valid until April 30th, 2026)
CURRENT_DATE=$(date +%Y%m%d)
END_DATE=20260430

TEMP_TARGET=0
DIVINE_TARGET=0

if [ "$CURRENT_DATE" -le "$END_DATE" ]; then
  TEMP_TARGET=$((1000 + RANDOM % 501))
  DIVINE_TARGET=$((2000 + RANDOM % 501))
  echo "Temporary boost active until April 30th."
  echo "Divine target: $DIVINE_TARGET"
  echo "Other temporary packages target: $TEMP_TARGET"
fi

echo "Clearing global npm cache..."
npm cache clean --force

echo "Starting Download Boost"
echo "All @winsznx Packages: $WINSZNX_TARGET iterations"

while [ $COUNT -lt $TARGET ]; do
  dir=$(mktemp -d)
  cache_dir=$(mktemp -d)
  cd "$dir" || exit

  SELECTED_PACKAGES=()

  # All @winsznx packages get 5000-7000 downloads
  if [ $COUNT -lt $WINSZNX_TARGET ]; then
    SELECTED_PACKAGES+=("${PACKAGES[@]}")
  fi
  
  # Add Divine if under target
  if [ $COUNT -lt $DIVINE_TARGET ]; then
    SELECTED_PACKAGES+=("@divinedilibe/gm-dapp")
  fi

  # Add temporary packages if they haven't reached their random targets
  if [ $COUNT -lt $TEMP_TARGET ]; then
    SELECTED_PACKAGES+=(
      "@earnwithalee/stx-contract"
      "@earnwithalee/stacksrank-sdk"
      "@earnwithalee/x402-conduit"
      "@earnwithalee/stacks-checkin-sdk"
      "@earnwithalee/bitcoin-native"
    )
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
  
  # Log every 100 iterations to avoid GitHub log limits
  if [ $((COUNT % 100)) -eq 0 ] || [ $COUNT -eq $TARGET ]; then
    echo "[$COUNT/$TARGET] Downloaded ${#SELECTED_PACKAGES[@]} packages."
  fi
  
  # Note: The sleep timer was completely removed because 7000 downloads with a sleep
  # timer would take 9+ hours and GitHub Actions kills jobs after 6 hours.
done

echo "🎉 Daily organic boost complete. Target of $TARGET met."