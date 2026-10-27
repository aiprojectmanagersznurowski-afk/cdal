---
title: "Frequently Asked Questions"
description: "Common questions about CDAL, AI tampering, CI speed, and overhead"
---

# Frequently Asked Questions (FAQ)

### Does CDAL send any code to external servers?
**No.** All commands (`cdal validate`, `cdal codegen`, `cdal audit`, `cdal trace`, `cdal selftest`) execute 100% locally on your machine. `@cdal/core` has zero runtime dependencies and makes zero network requests.

### How much overhead do the PreToolUse hooks add?
Hook performance is strictly benchmarked at **< 150ms p95** per invocation. Because hooks run directly via Node.js standard library with compiled regex patterns, agents do not experience noticeable latency when editing files.

### Why not just put rules in `CLAUDE.md` or `AGENTS.md`?
LLMs are probabilistic. Empirical benchmarks demonstrate that in multi-turn sessions with large diffs, agents ignore markdown instructions in 20% to 40% of complex tasks—especially when tests fail and the agent faces pressure to "make it pass". CDAL couples markdown instructions with **physical exit-2 hooks** and **git phase diff gates**.

### How does CDAL prevent agents from bypassing `@ts-ignore` rules?
The CDAL guard engine includes gate-evasion detection. If an agent tries to construct forbidden tokens using string splitting (e.g. `['@ts', 'ignore'].join('')`) or double casting (`as unknown as Target`), the probe engine catches the evasion immediately.

### Can CDAL be used without Claude Code?
**Yes.** CDAL supports Cursor, Codex, OpenHands, and generic IDE environments via `AGENTS.md`, `.cursor/rules/`, and the `cdal phase <contract|red|green> --base origin/main` gate in your CI pipeline.
