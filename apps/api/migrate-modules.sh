#!/usr/bin/env bash
# One-off codemod for the non-auth modules after the AppError/prisma changes.
# Run from the repo root, review with `git diff`, then delete this file.
set -euo pipefail
cd apps/api/src/modules

# AppError(status, code, message) -> AppError(code, message, status)
perl -0pi -e 's/new AppError\(\s*(\d{3}),\s*("[^"]*"),\s*("[^"]*"),?\s*\)/new AppError($2, $3, $1)/g' \
  $(grep -rl "new AppError(" .)

# prisma client now comes from the app, not @workspace/db
sed -i -E 's#import \{ ?prisma as db ?\} from "@workspace/db"#import { prisma as db } from "../../lib/prisma.js"#' \
  $(grep -rl 'prisma as db' .)

# Activity.type is now an enum: type the local buffer with ActivityType
perl -0pi -e 's/  PaginationMeta,\n\} from "\@workspace\/shared"/  PaginationMeta,\n  ActivityType,\n} from "\@workspace\/shared"/; s/const activities: \{ type: string;/const activities: { type: ActivityType;/' \
  incidents/incidents.service.ts