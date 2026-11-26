#!/usr/bin/env bash
# Usage : signer.sh application.apk cle.p12   (mot de passe dans KEYSTORE_PASSWORD)
set -euo pipefail
signer=$(ls "$ANDROID_HOME"/build-tools/*/apksigner | sort -V | tail -1)
"$signer" sign --ks "$2" --ks-key-alias pixelpulse \
  --ks-pass env:KEYSTORE_PASSWORD --key-pass env:KEYSTORE_PASSWORD "$1"
"$signer" verify --print-certs "$1" | grep 'SHA-256 digest'
