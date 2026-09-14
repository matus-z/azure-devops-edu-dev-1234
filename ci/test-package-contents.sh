#!/usr/bin/env bash
#
# Overí, že `src/` obsahuje všetky povinné súbory aplikácie.
#
# Balík sa nezostavuje ani nekopíruje: `src/` je presne to, čo sa publikuje,
# takže artefakt je samotný `src/`. Build tu preto znamená overenie, nie
# zostavenie — a pipeline nevytvára žiadny priečinok.
#
# `tests/`, `ci/` a `README.md` sú mimo `src/`, takže sa do balíka nedostanú.
# Nový súbor (napr. ďalší hook) sa doň dostane sám, bez zásahu do pipeline.
#
# Použitie:
#   ./ci/test-package-contents.sh [--path src]

set -euo pipefail

path="src"
required="index.html style.css calc.js app.js"

while [ $# -gt 0 ]; do
  case "$1" in
    --path)     path="$2";     shift 2 ;;
    --required) required="$2"; shift 2 ;;
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

missing=""
for file in $required; do
  if [ ! -f "$path/$file" ]; then
    missing="${missing:+$missing, }$file"
  fi
done

if [ -n "$missing" ]; then
  echo "##vso[task.logissue type=error]Chýbajú súbory: $missing"
  exit 1
fi

echo "Balík \"$path\" obsahuje všetky povinné súbory:"
find "$path" -type f | sort
