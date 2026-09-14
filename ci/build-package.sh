#!/usr/bin/env bash
#
# Zostaví balík aplikácie: overí povinné súbory a skopíruje `src/` do `dist/`.
#
# Celá aplikácia leží v `src/`, preto je build obyčajné skopírovanie priečinka.
# Nový súbor (napr. ďalší hook) sa do balíka dostane sám, bez zásahu do
# pipeline. `tests/`, `ci/` a `README.md` sú mimo `src/`, takže sa do balíka
# nedostanú.
#
# Použitie:
#   ./ci/build-package.sh [--source src] [--destination dist]

set -euo pipefail

source_dir="src"
destination_dir="dist"
required="index.html style.css calc.js app.js"

while [ $# -gt 0 ]; do
  case "$1" in
    --source)      source_dir="$2";      shift 2 ;;
    --destination) destination_dir="$2"; shift 2 ;;
    --required)    required="$2";        shift 2 ;;
    *)
      echo "##vso[task.logissue type=error]Neznámy parameter: $1"
      exit 1
      ;;
  esac
done

missing=""
for file in $required; do
  if [ ! -f "$source_dir/$file" ]; then
    missing="${missing:+$missing, }$file"
  fi
done

if [ -n "$missing" ]; then
  echo "##vso[task.logissue type=error]Chýbajú súbory: $missing"
  exit 1
fi

mkdir -p "$destination_dir"
# `$source_dir/.` (nie `$source_dir`) — kopírujeme obsah priečinka, nie
# priečinok samotný. Inak by pri existujúcom cieli vznikol `dist/src/`.
cp -R "$source_dir/." "$destination_dir/"

echo "Balík \"$destination_dir\" zostavený z \"$source_dir\":"
find "$destination_dir" -type f | sort
