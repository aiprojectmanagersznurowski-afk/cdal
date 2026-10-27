---
"@cdal/core": minor
"@cdal/kinds": minor
"@cdal/adapters": minor
"@cdal/audit": minor
"cdal": minor
---

Initial release of CDAL Kit (Contract-Driven Agentic Loop) v0.1.0:
- Pure Node.js ESM core invariant and contracts engine (zero runtime dependencies)
- Standard contract kinds: requirements, state-machine, policies
- Subagent role-scoping and PreToolUse physical hooks (exit 2) for Claude Code and Cursor/AGENTS.md
- Deterministic requirement-to-test traceability matrix (`cdal trace --enforce`)
- Quality gate mutation testing (`cdal selftest`)
- 100% offline hygiene audit scanner and interactive HTML report (`cdal audit`)
- Project initialization and automated verification pipelines (`cdal init`, `cdal verify`)
