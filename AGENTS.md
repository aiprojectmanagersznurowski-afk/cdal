# AGENTS.md — Agent Quality & Role Guidelines

<!-- BEGIN CDAL MANAGED SECTION -->
## Contract-Driven Agentic Loop (CDAL) Quality Gates

This project enforces strict contract-driven development quality gates:

### 1. The Loop Cycle
`PLAN` → `CONTRACT` → `RED` → `GREEN` → `VERIFY` → `REVIEW` → `INTEGRATE`

- **PLAN**: Define requirements with explicit IDs (`REQ-*`) in work orders.
- **CONTRACT**: Invariants and state machines live in `contracts/*.contract.mjs`. Modify only when window is open.
- **RED**: Write failing tests tagged with `// @REQ: <ID>`. Validate failure before implementing.
- **GREEN**: Implement production features to pass tests. Never modify tests in this phase.
- **VERIFY**: Run full deterministic verification pipeline (`npx cdal verify`).
- **REVIEW**: Validate zero drift, phase compliance, and full requirement traceability.

### 2. Role Boundaries & Phase Enforcement
- **spec-analyst**: write scopes `docs/workorders/, .cdal/state/`
- **contract-steward**: write scopes `contracts/, packages/core/src/generated/contracts/`
- **test-author**: write scopes `packages/*/test/, tests/, .cdal/state/`
- **implementer**: write scopes `packages/, src/, .cdal/state/` (STRICTLY DENIED from editing tests)
- **reviewer**: write scopes `.cdal/memory/`

> **Phase Gate Enforcement:**
> In runtimes without pre-tool hooks (Codex, Cursor, etc.), phase compliance is enforced via `cdal phase`:
> - Check RED phase: `npx cdal phase red --base <ref>`
> - Check GREEN phase: `npx cdal phase green --base <ref>`
> - Check CONTRACT phase: `npx cdal phase contract --base <ref>`
> All PRs must satisfy `npx cdal phase green --base origin/main` in CI.

### 3. Deterministic Verification Steps
- `node packages/cli/bin/cdal.mjs validate --strict`
- `node packages/cli/bin/cdal.mjs codegen --check`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `node packages/cli/bin/cdal.mjs trace --enforce`
- `node packages/cli/bin/cdal.mjs selftest`
<!-- END CDAL MANAGED SECTION -->
