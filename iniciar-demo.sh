#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 20 ou mais recente não foi encontrado. Instale-o e tente novamente."
  exit 1
fi

cd "$SCRIPT_DIR/release"
exec node server.cjs --open
