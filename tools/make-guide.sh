#!/usr/bin/env bash
# Make a reading guide with Claude Code, without opening an interactive session.
# Usage: tools/make-guide.sh <article-url-or-pdf-path>
# Needs: the `claude` command (Claude Code) and node.
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: tools/make-guide.sh <article-url-or-pdf-path>" >&2
  exit 2
fi
cd "$(dirname "$0")/.."

claude -p "Use the make-guide skill in .claude/skills/make-guide/SKILL.md to make a reading guide for this article: $1" \
  --allowedTools "Read" "Write" "Edit" "WebFetch" "Bash(node tools/validate.mjs:*)"

node tools/validate.mjs
