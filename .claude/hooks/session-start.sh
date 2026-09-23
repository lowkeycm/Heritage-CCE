#!/bin/bash
# SessionStart hook for Claude Code on the web. Runs before every remote session.
# Covers the bootstrap items an agent otherwise forgets: commit identity, dependencies,
# and the Marketing-Hub skill pointers (only if the Hub is checked out next door).
# Codex and Perplexity do not run this file; for them the AGENTS.md bootstrap checklist
# is the equivalent and is done by hand at session start.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# Commit identity, set before any work so commits never land as "Claude".
git config user.name "lowkeycm"
git config user.email "lowkeycm@users.noreply.github.com"

# Dependencies, so the build gate works cold. Edit for the project's toolchain.
if [ -f pnpm-lock.yaml ]; then
  if command -v corepack >/dev/null 2>&1; then
    corepack pnpm install --frozen-lockfile
  elif command -v pnpm >/dev/null 2>&1; then
    expected="$(node -p "require('./package.json').packageManager || ''")"
    actual="pnpm@$(pnpm --version)"
    if [ "$actual" != "$expected" ]; then
      echo "Pinned pnpm version unavailable; install through the project bootstrap instructions." >&2
      exit 1
    fi
    pnpm install --frozen-lockfile
  else
    echo "pnpm/Corepack unavailable; follow the project bootstrap instructions." >&2
    exit 1
  fi
elif [ -f package-lock.json ]; then
  npm ci --no-audit --no-fund
fi

# Marketing-Hub skill pointers. Skipped quietly when the Hub is not checked out.
HUB="${MARKETING_HUB:-$CLAUDE_PROJECT_DIR/../Marketing-Hub}"
if [ -f "$HUB/install/hub-skills.mjs" ]; then
  node "$HUB/install/hub-skills.mjs" --root "$CLAUDE_PROJECT_DIR"
else
  echo "Marketing-Hub installer not found at $HUB/install; skill pointers left as committed."
fi
