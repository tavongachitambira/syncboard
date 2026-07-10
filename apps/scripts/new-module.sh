#!/usr/bin/env bash
#
# apps/scripts/new-module.sh
#
# Scaffolds a new docs learning module into apps/docs/modules/<name>/.
#
# Usage (from anywhere in the repo, via the root package.json script):
#   pnpm new-module auth-oauth2
#   pnpm new-module auth-oauth2.0
#   pnpm new-moudle auth-oauth2
#
# Or directly:
#   bash apps/scripts/new-module.sh auth-oauth2
#
set -euo pipefail

NAME="${1:-}"
if [ -z "$NAME" ]; then
  echo "Usage: pnpm new-module <module-name>"
  echo "Example: pnpm new-module auth-oauth2"
  exit 1
fi

if [[ ! "$NAME" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*[A-Za-z0-9]$ && ! "$NAME" =~ ^[A-Za-z0-9]$ ]]; then
  echo "Module name must use letters, numbers, dots, underscores, or hyphens."
  echo "Examples: auth-oauth2, auth-oauth2.0, auth_oauth2"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

DOCS_DIR="$ROOT_DIR/apps/docs"
README_PATH="$DOCS_DIR/readme.md"
TARGET_DIR="$DOCS_DIR/modules/$NAME"

if [ -d "$TARGET_DIR" ]; then
  echo "Module '$NAME' already exists at apps/docs/modules/$NAME. Aborting so nothing gets overwritten."
  exit 1
fi

mkdir -p "$TARGET_DIR/examples" "$TARGET_DIR/assets"

cat > "$TARGET_DIR/readme.md" <<EOF
# $NAME

## Goal

Write the purpose of this module here.

## Topics

- 

## Notes

See [notes.md](./notes.md).

## Examples

Put runnable examples in [examples](./examples/).
EOF

cat > "$TARGET_DIR/notes.md" <<EOF
# $NAME Notes

## Questions

- 

## Findings

- 

## Links

- 
EOF

cat > "$TARGET_DIR/resources.md" <<EOF
# $NAME Resources

## Official Docs

- 

## Articles

- 

## Videos

- 
EOF

touch "$TARGET_DIR/examples/.gitkeep" "$TARGET_DIR/assets/.gitkeep"

MODULE_LINK="- [$NAME](./modules/$NAME/readme.md)"
if [ -f "$README_PATH" ] && ! grep -Fq -- "$MODULE_LINK" "$README_PATH"; then
  if ! grep -q "^## Modules$" "$README_PATH"; then
    printf "\n## Modules\n" >> "$README_PATH"
  fi

  TEMP_README="$(mktemp)"
  awk -v module_link="$MODULE_LINK" '
    BEGIN {
      in_modules = 0
      inserted = 0
      pending_blank = 0
    }
    /^## Modules$/ {
      print
      in_modules = 1
      next
    }
    in_modules && /^## / {
      if (!inserted) {
        print ""
        print module_link
        print ""
        inserted = 1
      }
      in_modules = 0
      print
      next
    }
    in_modules && /^$/ {
      pending_blank = 1
      next
    }
    in_modules {
      if (pending_blank) {
        print ""
        pending_blank = 0
      }
      print
      next
    }
    {
      print
    }
    END {
      if (in_modules && !inserted) {
        print ""
        print module_link
      }
    }
  ' "$README_PATH" > "$TEMP_README"
  mv "$TEMP_README" "$README_PATH"
fi

echo "Created apps/docs/modules/$NAME"
echo "Next steps:"
echo "  1. Open apps/docs/modules/$NAME/notes.md"
echo "  2. Start writing your notes"
