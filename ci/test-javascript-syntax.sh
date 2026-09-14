#!/usr/bin/env bash
#
# Syntaktická kontrola všetkých `.js` súborov bez ich spustenia.
#
# `node --check` zachytí preklep, ktorý by inak spadol až v prehliadači.
# Súbory sa hľadajú rekurzívne, takže nový hook je pokrytý automaticky.
#
# Použitie:
#   ./ci/test-javascript-syntax.sh [--path src]

set -euo pipefail

path="src"

while [ $# -gt 0 ]; do
  case "$1" in
    --path) path="$2"; shift 2 ;;
    *)
      echo "##vso[task.logissue type=error]Neznámy parameter: $1"
      exit 1
      ;;
  esac
done

if [ ! -d "$path" ]; then
  echo "##vso[task.logissue type=error]\"$path\" nie je priečinok"
  exit 1
fi

count=0
# `-iname` zámerne, nie `-name`: na Linuxe je porovnávanie názvov citlivé na
# veľkosť písmen, takže `Hook.JS` by sa inak ticho preskočil.
while IFS= read -r script; do
  # `find` bez zhody vráti prázdny výstup, ktorý je jeden prázdny riadok.
  [ -n "$script" ] || continue
  count=$((count + 1))
  if ! node --check "$script"; then
    echo "##vso[task.logissue type=error]$script má syntaktickú chybu"
    exit 1
  fi
done <<INNER
$(find "$path" -type f -iname '*.js' | sort)
INNER

if [ "$count" -eq 0 ]; then
  echo "##vso[task.logissue type=error]V \"$path\" nie sú žiadne .js súbory — kontrola by prešla naprázdno"
  exit 1
fi

echo "OK — všetkých $count skriptov je syntakticky v poriadku."
