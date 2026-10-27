---
description: Execute CDAL phase loop (PLAN -> CONTRACT -> RED -> GREEN -> VERIFY -> REVIEW)
---

# /cdal-loop

Enforces the deterministic CDAL loop:
1. **PLAN**: Define requirements with `spec-analyst`.
2. **CONTRACT**: Update contracts if needed with `contract-steward`.
3. **RED**: Write failing tests with `test-author` (`cdal phase red`).
4. **GREEN**: Implement production code with `implementer` (`cdal phase green`).
5. **VERIFY**: Run full deterministic verification (`pnpm verify`).
6. **REVIEW**: Verify zero drift and trace coverage (`cdal trace --enforce`).
