#!/usr/bin/env bash
#
# Overí, že sa stránka dá otvoriť dvojklikom (z `file://`).
#
# Ak sa do stránky dostane `type="module"`, prehliadač ju z `file://` odmietne
# načítať — a zistili by sme to až na workshope. Preto sa to kontroluje tu, nad
# zostaveným balíkom.
#
# Použitie:
#   ./ci/test-file-protocol.sh [--page src/index.html]

set -euo pipefail

page="src/index.html"

while [ $# -gt 0 ]; do
  case "$1" in
    --page) page="$2"; shift 2 ;;
    *)
      echo "##vso[task.logissue type=error]Neznámy parameter: $1"
      exit 1
      ;;
  esac
done

if [ ! -f "$page" ]; then
  echo "##vso[task.logissue type=error]$page neexistuje — nie je čo kontrolovať"
  exit 1
fi

if grep -Eq 'type[[:space:]]*=[[:space:]]*"module"' "$page"; then
  echo "##vso[task.logissue type=error]$page obsahuje type=module — aplikácia sa neotvorí z file://"
  exit 1
fi

echo "OK — aplikácia sa dá otvoriť dvojklikom."
