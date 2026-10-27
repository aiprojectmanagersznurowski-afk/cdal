---
title: "CLI Reference"
description: "Complete command-line reference for cdal CLI commands, flags, and options"
---

# CDAL CLI Reference (`cdal`)

> **Note:** This documentation is generated deterministically from CLI command definitions. All commands are packaged in pure ESM and execute with zero runtime dependencies in `@cdal/core`.

## Quick Command Matrix

| Command | Summary | Key Options |
|---|---|---|
| [`cdal init`](#cdal-init) | Initialize CDAL in an existing or new project | `--preset`, `--runtime`, `-y,` |
| [`cdal validate`](#cdal-validate) | Validate contract invariants and integrity | `--strict`, `--json`, `--contracts` |
| [`cdal codegen`](#cdal-codegen) | Generate deterministic TypeScript types and architecture diagrams | `--check`, `--out` |
| [`cdal window`](#cdal-window) | Manage contract window for protected path mutations | `open`, `close`, `status` |
| [`cdal trace`](#cdal-trace) | Verify requirement-to-test traceability matrix | `--enforce`, `--markdown`, `--json` |
| [`cdal phase`](#cdal-phase) | Enforce CDAL loop phase gates from git diff | `--base` |
| [`cdal selftest`](#cdal-selftest) | Execute mutation testing on quality gates themselves | `--kinds`, `--verbose` |
| [`cdal sync`](#cdal-sync) | Regenerate agent runtime configs from cdal.config.mjs | `--check` |
| [`cdal verify`](#cdal-verify) | Run full deterministic verification pipeline | `--fast`, `--clean` |
| [`cdal hook`](#cdal-hook) | PreToolUse entrypoint for agent runtime hook routing | `--runtime`, `--config` |
| [`cdal audit`](#cdal-audit) | Scan repository for AI hygiene and export offline HTML report | `--html`, `--json`, `--lang` |
| [`cdal doctor`](#cdal-doctor) | Diagnose CDAL installation and environment health | — |

---

## `cdal init`

**Initialize CDAL in an existing or new project**

```bash
npx cdalkit init [options]
```

Scaffolds cdal.config.mjs, contracts directory, agent runtime adapters (.claude, .agents, AGENTS.md), and adds verification scripts to package.json.

### Options

- `--preset <name>`: Preset to include (typescript-strict, nextjs, node-service)
- `--runtime <name>`: Agent runtime to configure (claude-code, agents-md, antigravity)
- `-y, --yes`: Non-interactive mode with safe defaults

### Example

```bash
npx cdalkit init --preset typescript-strict --yes
```

---

## `cdal validate`

**Validate contract invariants and integrity**

```bash
npx cdalkit validate [options]
```

Executes static semantic invariant rules across all registered contract kinds (requirements, state-machine, policies, and custom kinds).

### Options

- `--strict`: Fail if any warnings are emitted
- `--json`: Output findings in structured findings.v1 JSON schema
- `--contracts <dir>`: Override default contracts directory

### Example

```bash
npx cdalkit validate --strict
```

---

## `cdal codegen`

**Generate deterministic TypeScript types and architecture diagrams**

```bash
npx cdalkit codegen [options]
```

Emits immutable TypeScript interfaces, constants, and mermaid markdown diagrams directly from contracts as single source of truth.

### Options

- `--check`: Drift detector: exits with code 1 if generated code is out of sync byte-for-byte
- `--out <dir>`: Override target output directory

### Example

```bash
npx cdalkit codegen --check
```

---

## `cdal window`

**Manage contract window for protected path mutations**

```bash
npx cdalkit window <open|close|status> [ticket]
```

Enforces controlled mutation windows for contracts and generated files. Protected paths can only be edited when the contract window is open.

### Options

- `open <ticket>`: Open window referencing a specific work order or ticket
- `close`: Close window and lock protected paths
- `status`: Check current window state (open / closed)

### Example

```bash
npx cdalkit window open WO-104
# edit contracts/*.contract.mjs
npx cdalkit window close
```

---

## `cdal trace`

**Verify requirement-to-test traceability matrix**

```bash
npx cdalkit trace [options]
```

Scans test suites for // @REQ: <ID> markers and validates 100% coverage of active contract requirements.

### Options

- `--enforce`: Exits with code 1 if any requirement lacks automated test coverage
- `--markdown`: Outputs markdown table suitable for PR descriptions
- `--json`: Outputs trace coverage matrix as JSON

### Example

```bash
npx cdalkit trace --enforce
```

---

## `cdal phase`

**Enforce CDAL loop phase gates from git diff**

```bash
npx cdalkit phase <contract|red|green> [options]
```

Enforces phase boundaries across IDEs and CI: CONTRACT (only contracts modified), RED (only test files modified), GREEN (production code modified, zero test modifications).

### Options

- `--base <ref>`: Git reference or commit to diff against (default: origin/main or HEAD~1)

### Example

```bash
npx cdalkit phase green --base origin/main
```

---

## `cdal selftest`

**Execute mutation testing on quality gates themselves**

```bash
npx cdalkit selftest [options]
```

Tests whether validator invariants and guardrails actually fire red when violated. Proves gates are non-decorative.

### Options

- `--kinds <list>`: Filter specific kinds to probe
- `--verbose`: Show detailed mutation failure logs

### Example

```bash
npx cdalkit selftest
```

---

## `cdal sync`

**Regenerate agent runtime configs from cdal.config.mjs**

```bash
npx cdalkit sync [options]
```

Keeps .claude/settings.json, .agents/, and AGENTS.md synchronized with role definitions in cdal.config.mjs.

### Options

- `--check`: Drift detector: exits with code 1 if runtime files are out of sync

### Example

```bash
npx cdalkit sync --check
```

---

## `cdal verify`

**Run full deterministic verification pipeline**

```bash
npx cdalkit verify [options]
```

Executes the complete verification suite defined in cdal.config.mjs (validate, codegen --check, typecheck, lint, test, trace, selftest).

### Options

- `--fast`: Run essential fast checks only
- `--clean`: Clear build and test caches before verifying

### Example

```bash
npx cdalkit verify
```

---

## `cdal hook`

**PreToolUse entrypoint for agent runtime hook routing**

```bash
npx cdalkit hook <guard-paths|guard-forbidden|guard-bash|session-context|log-subagent> [role] [options]
```

Reads tool execution payload from stdin. Validates write scopes (denyTests), forbidden patterns, and bash commands. Exits with code 2 to block tool execution.

### Options

- `--runtime <adapter>`: Runtime format: claude-code, antigravity, or generic
- `--config <path>`: Path to cdal.config.mjs

### Example

```bash
echo '{"tool_name":"Edit","tool_input":{"file_path":"test.ts"}}' | npx cdalkit hook guard-paths implementer
```

---

## `cdal audit`

**Scan repository for AI hygiene and export offline HTML report**

```bash
npx cdalkit audit [path] [options]
```

Runs 8 static checks (< 20s) evaluating agent configuration, type silencing density, skipped tests, role separation, traceability, and secrets. Pure local execution, zero network requests.

### Options

- `--html <file>`: Path to write standalone offline HTML report (default: cdal-audit-report.html)
- `--json`: Output audit report in audit.v1 JSON schema
- `--lang <pl|en>`: Report language (default: pl)

### Example

```bash
npx cdalkit audit --html ./report.html
```

---

## `cdal doctor`

**Diagnose CDAL installation and environment health**

```bash
npx cdalkit doctor
```

Verifies Node.js version (>=20.9), git repository state, config validity, hook bindings, and detects configuration drift.

### Example

```bash
npx cdalkit doctor
```

---
