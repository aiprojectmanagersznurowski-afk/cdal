---
title: "Agent Runtimes"
description: "Configuring Claude Code, AGENTS.md, Cursor rules, and Antigravity"
---

# Supported Agent Runtimes

CDAL supports multi-runtime orchestration through the `cdal sync` engine.

---

## 1. Claude Code (Full Hook Support)

Claude Code supports runtime PreToolUse interception. When configuring `cdal.config.mjs` with `runtimes: ['claude-code']`:

Running `cdal sync` generates:
- `.claude/settings.json` configuring PreToolUse hooks pointing to `node node_modules/cdal/bin/cdal.mjs hook <name>`.
- `.claude/agents/*.md` definitions for each configured role.
- `.claude/commands/cdal-*.md` slash command shortcuts (`/cdal-loop`, `/cdal-verify`, `/cdal-plan`, etc.).

### PreToolUse Hooks:
- `guard-paths`: Enforces role write scopes and `denyTests: true`.
- `guard-forbidden`: Blocks file writes containing `@ts-ignore`, `as any`, or secret patterns.
- `guard-bash`: Prevents destructive shell commands (`rm -rf`, `git push --force`).

---

## 2. AGENTS.md (Universal: Cursor, Codex, OpenHands)

For runtimes that rely on system markdown guidelines rather than native PreToolUse hooks, `cdal sync` maintains managed sections in `AGENTS.md` and `.cursor/rules/cdal.mdc`.

### Managed Section in `AGENTS.md`:
```markdown
<!-- BEGIN CDAL MANAGED SECTION -->
## Contract-Driven Agentic Loop (CDAL) Quality Gates
...
<!-- END CDAL MANAGED SECTION -->
```
Any content outside these boundary markers is preserved intact.

Enforcement is guaranteed via `cdal phase <contract|red|green> --base origin/main` in your CI workflow.

---

## 3. Antigravity / Gemini

Generates `.agents/` workflows, rules, and subagent role definitions (`.agents/agents/*.md`, `.agents/workflows/*.md`).
