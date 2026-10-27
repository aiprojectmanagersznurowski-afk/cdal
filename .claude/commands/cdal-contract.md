---
description: Manage contract window and update contracts as single source of truth
---

# /cdal-contract

1. Open contract window: `npx cdal window open <TICKET>`
2. Run `contract-steward` to update `contracts/*.contract.mjs`.
3. Validate invariants: `npx cdal validate --strict`
4. Regenerate artifacts: `npx cdal codegen`
5. Close contract window: `npx cdal window close`
