# Changelog

All notable changes to the **CDAL Kit** project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] - 2026-10-27

### Added
- **@cdal/core:**
  - Zero-dependency Node.js ESM core invariant validator.
  - Contract loader supporting `*.contract.mjs` domain contracts.
  - Role write-scope policy engine (`spec-analyst`, `contract-steward`, `test-author`, `implementer`).
  - Active gate mutation testing runner (`selftest`).
  - Strict requirement-to-test traceability matrix (`trace --enforce`).
  - PreToolUse path guard and forbidden token scanner (`@ts-ignore`, `as any`, `.skip()`, `.only()`).
- **@cdal/kinds:**
  - Standard contract kind implementations: `requirements`, `state-machine`, `policies`.
- **@cdal/adapters:**
  - Claude Code PreToolUse router with exit code 2 physical write denial.
  - AGENTS.md / Cursor / Codex markdown adapter and quality gate synchronization.
  - Antigravity / Gemini rule binding generator.
- **@cdal/audit:**
  - 100% offline static analysis engine evaluating 8 risk checkpoints in under 15s.
  - Standalone self-contained HTML report generator with dark UI and interactive audit scores.
  - Cal.com UTM tracking parameter handoff.
- **cdal (CLI):**
  - Command line interface: `validate`, `codegen`, `trace`, `selftest`, `audit`, `init`, `verify`, `doctor`, `phase`.
- **examples/booking-lite:**
  - Reference implementation under CDAL governance with 3 contracts, 16 requirements, 100% trace, and active selftest mutation verification.

