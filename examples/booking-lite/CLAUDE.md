# Project Instructions

<!-- BEGIN CDAL MANAGED SECTION -->
## Contract-Driven Agentic Loop (CDAL) Quality Gates

This repository enforces contract-driven development quality gates:
1. **Loop**: PLAN → CONTRACT → RED → GREEN → VERIFY → REVIEW → INTEGRATE.
2. **Contracts as Single Source of Truth**: All invariants and state machines live in `contracts/*.contract.mjs`.
3. **Role Scopes & Test Isolation**:
- `spec-analyst`
- `contract-steward`
- `test-author`
- `implementer`
- `reviewer`
   - Implementers are physically blocked from modifying test files (`denyTests: true`).
   - Test files are marked with `// @REQ: <ID>` tags.
4. **Deterministic Verification**:
- `node ../../packages/cli/bin/cdal.mjs validate --strict`
- `node ../../packages/cli/bin/cdal.mjs codegen --check`
- `pnpm typecheck`
- `pnpm test`
- `node ../../packages/cli/bin/cdal.mjs trace --enforce`
- `node ../../packages/cli/bin/cdal.mjs selftest`
<!-- END CDAL MANAGED SECTION -->
