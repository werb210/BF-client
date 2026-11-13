#!/bin/bash
# BF_CLIENT_ANDROID_UPLOAD_KEY_v1 - sets up the Android upload key for the "Upload Android build" actions.
# Run on the Mac that has the upload keystore:
#   curl -fsSL https://raw.githubusercontent.com/werb210/BF-client/main/scripts/android-upload-key.sh | bash
#
# What it does, without anyone having to know or type a password:
#   1. Looks for the existing upload keystore and a saved password for it. If the password is found and works,
#      that key is used and nothing needs to change at Google.
#   2. Otherwise it makes a NEW upload key with a random password, saves the password in the Mac's Keychain, and
#      puts the certificate Google needs on the Desktop (Google must approve the new key once: "upload key reset").
#   3. Stores the four signing secrets on the GitHub repositories (through the GitHub command line if it is installed
#      and signed in; otherwise it copies each value to the clipboard and waits while you paste it).
# No secret is printed, and none leaves this Mac except to GitHub's secret store.
set -euo pipefail

REPOS="${BOREAL_REPOS:-werb210/BF-client werb210/BF-portal werb210/boreal-dialer-ios}"
KEY_DIR="$HOME/Documents/Boreal-keys"
NEW_KEY="$KEY_DIR/boreal-play-upload-2026.jks"
CERT="$HOME/Desktop/boreal-upload-certificate.pem"
KEYCHAIN_ITEM="boreal-android-upload-key"

say() { printf '\n%s\n' "$*"; }
ask() { printf '%s' "$*" > /dev/tty; read -r _ < /dev/tty || true; }

# --- keytool (comes with Java or Android Studio) -------------------------------------------------------------------
KEYTOOL=""
for k in "$(command -v keytool || true)" \
         "/Applications/Android Studio.app/Contents/jbr/Contents/Home/bin/keytool" \
         "/Applications/Android Studio.app/Contents/jre/Contents/Home/bin/keytool" \
         /opt/homebrew/opt/openjdk*/bin/keytool /usr/local/opt/openjdk*/bin/keytool \
         /Library/Java/JavaVirtualMachines/*/Contents/Home/bin/keytool; do
  if [ -n "$k" ] && [ -x "$k" ] && "$k" -help >/dev/null 2>&1; then KEYTOOL="$k"; break; fi
done
if [ -z "$KEYTOOL" ]; then
  say "STOPPED: Java is not installed on this Mac, so the key cannot be made here."
  say "Tell Claude: \"no Java\"."
  exit 1
fi

find_files() { if command -v mdfind >/dev/null 2>&1; then mdfind -name "$1" 2>/dev/null || true; else find "$HOME" -name "$1" 2>/dev/null || true; fi; }
prop() { { grep -E "^[[:space:]]*$2[[:space:]]*[=:]" "$1" 2>/dev/null || true; } | head -1 | sed -E 's/^[^=:]*[=:][[:space:]]*//' | tr -d '\r'; }

KEYSTORE=""; STORE_PW=""; KEY_PW=""; ALIAS=""; NEEDS_GOOGLE="no"

# --- 1. the existing keystore, if a saved password for it works ---------------------------------------------------
OLD="$(find_files 'boreal-play-upload.jks' | head -1)"
if [ -n "$OLD" ] && [ -f "$OLD" ]; then
  CANDIDATES="$(security find-generic-password -s "$KEYCHAIN_ITEM" -w 2>/dev/null || true)"
  while IFS= read -r f; do
    [ -f "$f" ] || continue
    for name in storePassword RELEASE_STORE_PASSWORD keystorePassword ANDROID_KEYSTORE_PASSWORD password; do
      v="$(prop "$f" "$name")"; [ -n "$v" ] && CANDIDATES="$CANDIDATES
$v"
    done
  done <<EOF
$(find_files 'keystore.properties'; find_files 'key.properties'; find_files 'signing.properties'; ls "$(dirname "$OLD")"/*.properties "$(dirname "$OLD")"/*.txt 2>/dev/null || true)
EOF
  while IFS= read -r pw; do
    [ -n "$pw" ] || continue
    if "$KEYTOOL" -list -keystore "$OLD" -storepass "$pw" >/dev/null 2>&1; then
      KEYSTORE="$OLD"; STORE_PW="$pw"; KEY_PW="$pw"
      ALIAS="$("$KEYTOOL" -list -keystore "$OLD" -storepass "$pw" 2>/dev/null | { grep -E 'PrivateKeyEntry' || true; } | head -1 | cut -d, -f1)"
      break
    fi
  done <<EOF
$CANDIDATES
EOF
fi

# --- 2. otherwise a new key ----------------------------------------------------------------------------------------
if [ -z "$KEYSTORE" ]; then
  mkdir -p "$KEY_DIR"
  if [ -f "$NEW_KEY" ] && STORE_PW="$(security find-generic-password -s "$KEYCHAIN_ITEM" -w 2>/dev/null)" \
     && "$KEYTOOL" -list -keystore "$NEW_KEY" -storepass "$STORE_PW" >/dev/null 2>&1; then
    : # made on an earlier run: use it again
  else
    rm -f "$NEW_KEY"
    STORE_PW="$(openssl rand -base64 30 | tr -d '/+=\n' | cut -c1-28)"
    "$KEYTOOL" -genkeypair -keystore "$NEW_KEY" -storetype PKCS12 -alias upload -keyalg RSA -keysize 2048 \
      -validity 10000 -storepass "$STORE_PW" -keypass "$STORE_PW" \
      -dname "CN=Boreal Financial, O=Boreal Financial, L=Edmonton, ST=Alberta, C=CA" >/dev/null 2>&1 \
      || { say "STOPPED: could not make the new key. Tell Claude."; exit 1; }
    if command -v security >/dev/null 2>&1; then
      security add-generic-password -U -a "$USER" -s "$KEYCHAIN_ITEM" -w "$STORE_PW" >/dev/null
    fi
  fi
  KEYSTORE="$NEW_KEY"; KEY_PW="$STORE_PW"; ALIAS="upload"; NEEDS_GOOGLE="yes"
  mkdir -p "$(dirname "$CERT")"
  "$KEYTOOL" -export -rfc -keystore "$KEYSTORE" -alias "$ALIAS" -storepass "$STORE_PW" -file "$CERT" >/dev/null 2>&1 \
    || { say "STOPPED: could not write the certificate to $CERT. Tell Claude."; exit 1; }
fi

B64="$(base64 < "$KEYSTORE" | tr -d '\n')"

# --- 3. the GitHub secrets ---------------------------------------------------------------------------------------
put() { # name value
  if [ "${USE_GH:-no}" = "yes" ]; then
    for r in $REPOS; do printf '%s' "$2" | gh secret set "$1" -R "$r" >/dev/null && echo "  saved $1 on $r"; done
  else
    printf '%s' "$2" | pbcopy
    ask "  $1 is on the clipboard. Paste it into a new GitHub secret with exactly that name, click Add secret, then press Return here... "
  fi
}
USE_GH="no"
if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then USE_GH="yes"; fi
if [ "$USE_GH" = "no" ]; then
  say "The GitHub command line is not signed in on this Mac, so the four values are handed to you one at a time."
  say "Open: https://github.com/werb210/BF-client/settings/secrets/actions/new"
fi
say "Storing the signing secrets:"
put ANDROID_KEYSTORE_BASE64 "$B64"
put ANDROID_KEYSTORE_PASSWORD "$STORE_PW"
put ANDROID_KEY_ALIAS "$ALIAS"
put ANDROID_KEY_PASSWORD "$KEY_PW"
command -v pbcopy >/dev/null 2>&1 && printf '' | pbcopy || true

say "=================================================================="
if [ "$NEEDS_GOOGLE" = "yes" ]; then
  say "RESULT: NEW KEY. The old key's password could not be found, so a new upload key was made."
  say "  Key file:     $KEYSTORE"
  say "  Password:     in this Mac's Keychain, item \"$KEYCHAIN_ITEM\" (nobody needs to type it)"
  say "  For Google:   $CERT  (on the Desktop)"
  say "Tell Claude: \"new key\"."
else
  say "RESULT: EXISTING KEY. The old upload key and its saved password work; nothing to change at Google."
  say "Tell Claude: \"existing key\"."
fi
[ "$USE_GH" = "yes" ] && say "The secrets were saved on: $REPOS"
say "=================================================================="
