---
description: Run pre-merge review and audit on active branch
---

# /cdal-review

Runs `reviewer` role to verify:
- `npx cdalkit phase green`
- `npx cdalkit trace --enforce`
- `npx cdalkit selftest`
