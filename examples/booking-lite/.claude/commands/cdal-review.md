---
description: Run pre-merge review and audit on active branch
---

# /cdal-review

Runs `reviewer` role to verify:
- `npx cdal phase green`
- `npx cdal trace --enforce`
- `npx cdal selftest`
