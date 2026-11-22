#!/usr/bin/env sh
# Points this clone at the tracked hooks. Run once after cloning.
set -eu

cd "$(dirname "$0")/.."
git config core.hooksPath .githooks
chmod +x .githooks/pre-commit 2>/dev/null || true
printf 'Git hooks enabled from .githooks (core.hooksPath).\n'
