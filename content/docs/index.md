---
title: "Introduction"
description: "Quality gates and auditability for AI-written code"
---

# Contract-Driven Agentic Loop (CDAL)

> **"Your agents write the code. CDAL makes it shippable."**

Autonomous AI coding agents (Claude Code, Codex, Cursor, Gemini/Antigravity) write code at incredible speed. However, without external physical constraints, agents exhibit predictable failure modes:
- **Self-grading:** The agent writes the code, breaks a test, then rewrites the test assertions so everything appears "green".
- **Silent degradation:** Silencing type errors with `@ts-ignore` and `as any`, skipping broken tests with `.skip()`, or leaking hardcoded API keys.
- **Specification drift:** Disconnecting code implementation from core business requirements over multi-turn agent sessions.

**CDAL Kit** solves this by establishing **contract-driven development with enforceable physical quality gates**:

```
PLAN ──► CONTRACT ──► RED ──► GREEN ──► VERIFY ──► REVIEW ──► INTEGRATE
```

---

## Core Pillars of CDAL

1. **Contracts as the Single Source of Truth (`*.contract.mjs`):** Declarative domain invariants and state machines defined in pure ECMAScript. No build step required.
2. **Deterministic Code & Docs Generation (`cdal codegen`):** Emits immutable TypeScript types and Mermaid diagrams directly from contracts. Zero manual sync drift.
3. **Physical Role Scoping (`denyTests: true`):** The `implementer` role is physically blocked by PreToolUse hooks (exit code 2) from modifying test files. The developer cannot grade their own work.
4. **Traceability Matrix (`cdal trace --enforce`):** Every requirement (`REQ-*`) is mapped 1:1 to automated test suites tagged with `// @REQ: <ID>`.
5. **Mutation Testing for Gates (`cdal selftest`):** Proves that your quality gates are not decorative by deliberately injecting mutations and verifying that every validator invariant fails red.
6. **Zero Runtime Dependencies in Core:** `@cdal/core` is pure Node.js ESM. PreToolUse hooks execute in under 150ms p95.

---

## Navigation & Guide

- **[Getting Started](/docs/getting-started):** Install CDAL and initialize your first repository in 3 minutes.
- **[Concepts](/docs/concepts/contracts):** Dive into contracts, kinds, roles, the loop, and quality gates.
- **[CLI Reference](/docs/cli-reference):** Detailed options and flags for all `cdal` commands.
- **[Runtime Adapters](/docs/runtimes):** Setup Claude Code hooks, AGENTS.md, Cursor rules, and Antigravity.
- **[Custom Kinds](/docs/custom-kinds):** Build and test custom contract abstractions with full mutation testing.
- **[Polski Szybki Start](/docs/pl/szybki-start):** Przewodnik po polsku: instalacja i konfiguracja w 10 minut.
