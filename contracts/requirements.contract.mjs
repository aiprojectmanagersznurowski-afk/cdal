// @origin: cdal dogfooding requirements contract
/**
 * CDAL Kit Product Requirements Contract
 * Single source of truth for CDAL Kit features, quality gates, and runtime contracts.
 */

export const REQUIREMENTS = [
  {
    id: 'CDAL-REQ-CONFIG',
    source: 'docs/00-METHODOLOGY.md#config',
    statement: 'System must load and validate cdal.config.mjs with strict type-safety and presets.',
    acceptance: [
      'Invalid config throws CdalConfigError',
      'Presets merge forbidden and protected paths',
    ],
    status: 'DONE',
    priority: 'CRITICAL',
  },
  {
    id: 'CDAL-REQ-KINDS',
    source: 'docs/00-METHODOLOGY.md#kinds',
    statement:
      'System must support modular contract kinds with invariant rules, codegen, and selftest mutations.',
    acceptance: [
      'Custom contract kinds can register rules',
      'Cross-kind context is accessible during validation',
      'cdal validate and cdal codegen use the kinds registered in cdal.config.mjs (built-in kinds only when none are configured)',
    ],
    status: 'DONE',
    priority: 'HIGH',
  },
  {
    id: 'CDAL-REQ-VALIDATE',
    source: 'docs/00-METHODOLOGY.md#validate',
    statement:
      'cdal validate must evaluate contract rules and output findings in text and JSON formats.',
    acceptance: [
      'Exits 0 on valid contracts',
      'Exits 1 and outputs structured findings on invariant violations',
    ],
    status: 'DONE',
    priority: 'CRITICAL',
  },
  {
    id: 'CDAL-REQ-CODEGEN',
    source: 'docs/00-METHODOLOGY.md#codegen',
    statement:
      'cdal codegen must emit TypeScript types and Markdown documentation with drift detection.',
    acceptance: [
      'Identical outputs across consecutive runs',
      '--check exits with code 1 upon file drift',
    ],
    status: 'DONE',
    priority: 'HIGH',
  },
  {
    id: 'CDAL-REQ-GUARD-PATH',
    source: 'docs/00-METHODOLOGY.md#guard',
    statement:
      'guard-paths must enforce per-role write scopes and physically block implementers from test edits.',
    acceptance: [
      'Implementer role is denied editing test files (denyTests: true)',
      'Unauthorized paths return exit 2',
      'A role declared by a CDAL role hook but missing from cdal.config.mjs is denied every write (fail closed); sessions and built-in subagents without a declared role are only checked against protected paths',
    ],
    status: 'DONE',
    priority: 'CRITICAL',
  },
  {
    id: 'CDAL-REQ-GUARD-FORBIDDEN',
    source: 'docs/00-METHODOLOGY.md#guard',
    statement:
      'guard-forbidden must block compiler silencing (@ts-ignore, as any) and skipped tests.',
    acceptance: [
      'Matching patterns trigger exit code 2 with remedial message',
      'allowIn paths are exempt',
    ],
    status: 'DONE',
    priority: 'HIGH',
  },
  {
    id: 'CDAL-REQ-GUARD-BASH',
    source: 'docs/00-METHODOLOGY.md#guard',
    statement:
      'guard-bash must intercept dangerous shell executions including package publishing and raw deployment.',
    acceptance: [
      'Direct npm publish or vercel deploy is blocked',
      'Forbidden bash patterns trigger exit 2',
    ],
    status: 'DONE',
    priority: 'CRITICAL',
  },
  {
    id: 'CDAL-REQ-WINDOW',
    source: 'docs/00-METHODOLOGY.md#window',
    statement:
      'Protected contract files can only be modified while an explicit contract window is open.',
    acceptance: [
      'cdal window open/close manages ticket state',
      'Writing to contracts while window is closed triggers exit 2',
    ],
    status: 'DONE',
    priority: 'HIGH',
  },
  {
    id: 'CDAL-REQ-PHASE',
    source: 'docs/00-METHODOLOGY.md#phase',
    statement:
      'cdal phase must enforce file boundaries based on git diffs for RED, GREEN, and CONTRACT phases.',
    acceptance: [
      'RED phase accepts only test modifications',
      'GREEN phase rejects test changes if production changed',
    ],
    status: 'DONE',
    priority: 'CRITICAL',
  },
  {
    id: 'CDAL-REQ-SELFTEST',
    source: 'docs/00-METHODOLOGY.md#selftest',
    statement:
      'cdal selftest must prove quality gates fail when broken by running contract mutations.',
    acceptance: [
      'Every invariant rule has at least one positive mutation probe',
      'Fails if any rule cannot be broken',
    ],
    status: 'DONE',
    priority: 'CRITICAL',
  },
  {
    id: 'CDAL-REQ-TRACE',
    source: 'docs/00-METHODOLOGY.md#trace',
    statement:
      'cdal trace must map every requirement ID to tagged tests (@REQ:) and enforce 100% coverage.',
    acceptance: [
      'Scans @REQ annotations in test files',
      '--enforce fails if active requirements lack tests',
    ],
    status: 'DONE',
    priority: 'CRITICAL',
  },
  {
    id: 'CDAL-REQ-HOOK-ROUTER',
    source: 'docs/00-METHODOLOGY.md#hooks',
    statement:
      'cdal hook router must process tool payloads from Claude Code and Antigravity within 150ms SLA.',
    acceptance: [
      'P95 latency under 150ms benchmark in CI',
      'Supports stdin payload reading and exit 2 blocking',
    ],
    status: 'DONE',
    priority: 'HIGH',
  },
  {
    id: 'CDAL-REQ-ADAPTER-CLAUDE',
    source: 'docs/00-METHODOLOGY.md#adapters',
    statement:
      'System must generate .claude/settings.json, agent roles, commands, and CLAUDE.md with managed markers.',
    acceptance: [
      'Preserves custom user text outside managed markers',
      'Wires PreToolUse hooks to cdal hook',
      'Settings and role frontmatter follow the Claude Code hooks schema (matcher groups with typed command handlers)',
    ],
    status: 'DONE',
    priority: 'HIGH',
  },
  {
    id: 'CDAL-REQ-ADAPTER-AGENTS',
    source: 'docs/00-METHODOLOGY.md#adapters',
    statement: 'System must generate AGENTS.md and .cursor/rules/cdal.mdc for non-Claude runtimes.',
    acceptance: [
      'Updates managed section with phase gate guidelines',
      'Generates valid Cursor rule MDC files',
    ],
    status: 'DONE',
    priority: 'HIGH',
  },
  {
    id: 'CDAL-REQ-ADAPTER-ANTIGRAVITY',
    source: 'docs/00-METHODOLOGY.md#adapters',
    statement:
      'System must generate .agents/ workspace files respecting the 12,000 character limit per rule file.',
    acceptance: [
      'Maps Claude tools to Antigravity tools',
      'Splits rules files exceeding 12,000 characters',
    ],
    status: 'DONE',
    priority: 'HIGH',
  },
  {
    id: 'CDAL-REQ-SYNC',
    source: 'docs/00-METHODOLOGY.md#sync',
    statement:
      'cdal sync must regenerate adapter files and detect configuration drift via --check.',
    acceptance: [
      '--check exits 1 upon file drift',
      'Synchronizes all configured target runtimes',
      'Files marked <!-- cdal:preserve --> are user-owned: never overwritten or reported as drift',
    ],
    status: 'DONE',
    priority: 'HIGH',
  },
  {
    id: 'CDAL-REQ-INIT',
    source: 'docs/00-METHODOLOGY.md#init',
    statement:
      'cdal init must scaffold contracts, config, and runtime files for new or existing projects.',
    acceptance: ['Adds verify scripts to package.json', 'Preserves existing user configurations'],
    status: 'DONE',
    priority: 'HIGH',
  },
  {
    id: 'CDAL-REQ-VERIFY',
    source: 'docs/00-METHODOLOGY.md#verify',
    statement:
      'cdal verify must run configured pipeline steps in sequence and return single exit status.',
    acceptance: ['Returns 0 only when all steps succeed', 'Supports --fast and --full modes'],
    status: 'DONE',
    priority: 'CRITICAL',
  },
  {
    id: 'CDAL-REQ-DOCTOR',
    source: 'docs/00-METHODOLOGY.md#doctor',
    statement:
      'cdal doctor must inspect Node version, git state, hook wiring, and configuration health.',
    acceptance: ['Requires Node >= 20.9.0 LTS', 'Detects un-hooked environments and drifted files'],
    status: 'DONE',
    priority: 'MEDIUM',
  },
  {
    id: 'CDAL-REQ-KIND-REQUIREMENTS',
    source: 'docs/00-METHODOLOGY.md#kinds',
    statement:
      'Standard requirements kind must enforce unique IDs, valid statuses, and parent relationships.',
    acceptance: ['Detects duplicate requirement IDs', 'Validates status transitions'],
    status: 'DONE',
    priority: 'HIGH',
  },
  {
    id: 'CDAL-REQ-KIND-STATE-MACHINE',
    source: 'docs/00-METHODOLOGY.md#kinds',
    statement:
      'Standard state machine kind must verify reachability, no dead-ends, and deterministic transitions.',
    acceptance: ['Validates state reachability via BFS', 'Flags dead-end non-terminal states'],
    status: 'DONE',
    priority: 'HIGH',
  },
  {
    id: 'CDAL-REQ-KIND-POLICIES',
    source: 'docs/00-METHODOLOGY.md#kinds',
    statement:
      'Standard policies kind must validate numeric thresholds, scopes, units, and ascending bands.',
    acceptance: ['Bands must be strictly ordered', 'Missing scopes or units trigger findings'],
    status: 'DONE',
    priority: 'HIGH',
  },
  {
    id: 'CDAL-REQ-AUDIT-OFFLINE',
    source: 'docs/00-METHODOLOGY.md#audit',
    statement:
      'cdal audit must scan repositories offline for type silencing, skipped tests, and self-grading.',
    acceptance: ['Operates without internet connection', 'Evaluates codebase health score 0-100'],
    status: 'DONE',
    priority: 'HIGH',
  },
  {
    id: 'CDAL-REQ-AUDIT-REPORT',
    source: 'docs/00-METHODOLOGY.md#audit',
    statement:
      'cdal audit must generate a single-file offline HTML report with dark mode and action items.',
    acceptance: [
      'Zero external assets or CDN dependencies in HTML',
      'Includes actionable remediation guidance',
    ],
    status: 'DONE',
    priority: 'MEDIUM',
  },
  {
    id: 'CDAL-REQ-AUDIT-DRIFT',
    source: 'docs/00-METHODOLOGY.md#audit',
    statement:
      'Audit engine must detect untracked or manual edits to generated contract artifacts.',
    acceptance: [
      'Heuristic inspection of files with GENERATED banners',
      'Flags drift without requiring external tools',
    ],
    status: 'DONE',
    priority: 'MEDIUM',
  },
  {
    id: 'CDAL-REQ-GATE-EVASION',
    source: 'docs/00-METHODOLOGY.md#guard',
    statement:
      'Guard system must detect obfuscation patterns such as identifier splitting and dynamic eval.',
    acceptance: [
      'Blocks split string literals joined by empty separator',
      'Intercepts evasive regex and dynamic execution',
    ],
    status: 'DONE',
    priority: 'CRITICAL',
  },
  {
    id: 'CDAL-REQ-PRO-INSTALL',
    source: 'docs/00-METHODOLOGY.md#pro',
    statement:
      'CLI must install CDAL Pro content into a project from the private cdal-pro repository or a local copy, driven by the pro.manifest.json shipped with that content.',
    acceptance: [
      'Copies every manifest mapping into the project and records the installed version in .cdal/pro.json',
      'Never overwrites user-owned files unless --force is passed (files generated by cdalkit sync are replaced); --dry-run writes nothing',
      'Rejects manifest paths that are absolute or escape the source or project directory',
    ],
    status: 'DONE',
    priority: 'HIGH',
  },
];
