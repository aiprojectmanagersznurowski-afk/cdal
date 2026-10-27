---
title: "Agent Roles and Physical Scoping"
description: "Why role separation with denyTests is mandatory for AI development"
---

# Agent Roles & Physical Scoping

The most prevalent defect in AI-assisted development is **"The Self-Grading Agent"**:
> *An agent writes faulty code, observes test failures, then modifies the test file to match the buggy implementation.*

To prevent this, CDAL enforces **hard physical write boundaries per agent role**.

---

## Role Configuration (`cdal.config.mjs`)

```javascript
export default defineConfig({
  roles: {
    'spec-analyst': {
      write: ['docs/workorders/', '.cdal/state/'],
    },
    'contract-steward': {
      write: ['contracts/', 'src/generated/contracts/'],
    },
    'test-author': {
      write: ['test/', 'tests/', '**/*.test.ts', '.cdal/state/'],
    },
    'implementer': {
      write: ['src/', 'app/', 'packages/', '.cdal/state/'],
      denyTests: true, // Physical constraint: NEVER allowed to touch tests
    },
    'reviewer': {
      write: ['.cdal/memory/'],
    },
  },
});
```

---

## How Enforcement Works

1. **Claude Code / Subagent Hooks:**
   The `cdal hook guard-paths` entrypoint intercepts tool calls (`Edit`, `Write`) via PreToolUse hooks. If the active agent role is `implementer` and the target file is a test, the hook outputs an error message on `stderr` and terminates with **exit code 2**.
   *In Claude Code, exit code 2 immediately halts tool execution before any bytes are written to disk.*

2. **Universal Phase Gate (`cdal phase`):**
   In runtimes without hook capabilities (Codex, Cursor, OpenHands), the phase gate checks the git diff against `origin/main`:
   ```bash
   npx cdal phase green --base origin/main
   ```
   If any `.test.ts` or `spec` file was modified during the GREEN implementation phase, the gate fails the build in CI.
