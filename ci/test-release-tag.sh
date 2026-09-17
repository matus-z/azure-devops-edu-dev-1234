#!/usr/bin/env bash
#
# Overí, že release tag má tvar vX.Y.Z a ukazuje na commit v `main`.
#
# Zmyslom je, aby tag nikdy neoznačoval niečo, čo neprešlo `main`. Presne toto
# konfiguračný repozitár overiť nevie — on tagu verí. Tu sa to overiť dá.
#
# Vyžaduje celú históriu (`fetchDepth: 0`), nie plytký klon.
#
# Použitie:
#   ./ci/test-release-tag.sh --tag v1.2.1 [--branch main]

set -euo pipefail

tag=""
branch="main"

while [ $# -gt 0 ]; do
  case "$1" in
    --tag)    tag="$2";    shift 2 ;;
    --branch) branch="$2"; shift 2 ;;
    *)
      echo "##vso[task.logissue type=error]Neznámy parameter: $1"
      exit 1
      ;;
  esac
done

if [ -z "$tag" ]; then
  echo "##vso[task.logissue type=error]Chýba povinný parameter --tag"
  exit 1
fi

echo "Kontrolujem tag: $tag"

if [[ ! "$tag" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "##vso[task.logissue type=error]Tag '$tag' nemá tvar vX.Y.Z"
  exit 1
fi

git fetch origin "$branch" --quiet

if ! sha="$(git rev-list -n 1 "$tag" 2>/dev/null)"; then
  echo "##vso[task.logissue type=error]Tag '$tag' sa v repozitári nenašiel"
  exit 1
fi

if ! git merge-base --is-ancestor "$sha" "origin/$branch"; then
  echo "##vso[task.logissue type=error]Tag '$tag' neukazuje na commit v $branch"
  exit 1
fi

echo "OK — $tag ukazuje na $sha, ktorý je v $branch."
