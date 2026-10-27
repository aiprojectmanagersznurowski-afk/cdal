import path from 'node:path';
import { BUILTIN_PRESETS } from '../config/presets.js';
import type { BashRule, ForbiddenRule, ResolvedCdalConfig } from '../config/types.js';
import { isContractWindowOpen } from './contract-window.js';

export interface GuardResult {
  blocked: boolean;
  rule?: string;
  reason?: string;
}

export interface CheckWriteOptions {
  role?: string | null;
  /**
   * The role was declared by a CDAL role hook (e.g. `guard-paths implementer`), so it
   * must exist in the config: an unconfigured declared role is denied every write.
   */
  requireConfiguredRole?: boolean;
  enforceContract?: boolean;
  skipRules?: string[];
  config?: ResolvedCdalConfig;
  cwd?: string;
}

export interface CheckBashOptions {
  config?: ResolvedCdalConfig;
  cwd?: string;
}

export const TEST_PATH_PATTERNS = ['/tests/', '/e2e/', '/__tests__/', '.test.', '.spec.'];

export function toRelativePath(filePath: string, cwd: string = process.cwd()): string {
  if (!filePath) return '';
  const normalized = path.isAbsolute(filePath) ? path.relative(cwd, filePath) : filePath;
  return normalized.replace(/\\/g, '/');
}

export function isTestPath(relPath: string): boolean {
  const norm = `/${relPath.replace(/^\//, '')}`;
  return TEST_PATH_PATTERNS.some((p) => norm.includes(p) || relPath.includes(p));
}

export function isProtectedPath(relPath: string, protectedPatterns: string[]): boolean {
  for (const pattern of protectedPatterns) {
    const cleanPattern = pattern.replace(/\/$/, '');
    if (relPath === cleanPattern || relPath.startsWith(`${cleanPattern}/`)) {
      return true;
    }
    if (pattern.includes('*')) {
      const re = new RegExp(
        `^${pattern.replace(/\./g, '\\.').replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*')}`,
      );
      if (re.test(relPath)) return true;
    }
  }
  return false;
}

export function isPathInScope(relPath: string, scopes: string[]): boolean {
  for (const scope of scopes) {
    const cleanScope = scope
      .replace('**/', '')
      .replace(/\/\*\*$/, '')
      .replace(/\/$/, '');
    if (
      relPath.startsWith(`${cleanScope}/`) ||
      relPath === cleanScope ||
      relPath.includes(cleanScope)
    ) {
      return true;
    }
    if (scope.includes('*')) {
      const re = new RegExp(
        `^${scope.replace(/\./g, '\\.').replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*')}`,
      );
      if (re.test(relPath)) return true;
    }
  }
  return false;
}

export function checkWrite(
  rawPath: string,
  content = '',
  options: CheckWriteOptions = {},
): GuardResult {
  const cwd = options.cwd ?? process.cwd();
  const rel = toRelativePath(rawPath, cwd);
  if (!rel) return { blocked: false };

  const config = options.config;
  const role = options.role ?? null;
  const enforceContract = options.enforceContract ?? true;
  const skipRules = options.skipRules ?? [];

  // 1. Protected Paths Check
  const protectedPatterns = config?.protectedPaths ?? ['contracts/', 'src/generated/contracts/'];
  if (enforceContract && isProtectedPath(rel, protectedPatterns)) {
    if (role && role !== 'contract-steward') {
      return {
        blocked: true,
        rule: 'contract-path',
        reason: `Protected path "${rel}" can only be written by the "contract-steward" role. Contracts are single source of truth.`,
      };
    }
    if (!isContractWindowOpen(cwd)) {
      return {
        blocked: true,
        rule: 'contract-window',
        reason: `Contract window is closed. Modifying "${rel}" requires opening the contract window: cdal window open <TICKET>`,
      };
    }
  }

  // 2. Role-based Write Scope Enforcement
  if (role && config?.roles) {
    const roleDef = config.roles[role];

    // Fail closed: a role file declared this role, but nothing defines its write scope.
    if (!roleDef && options.requireConfiguredRole) {
      return {
        blocked: true,
        rule: 'role-unknown',
        reason: `Role "${role}" is not configured in cdal.config.mjs, so it has no write scope. Add it to "roles" (CDAL Pro: roles: proRoles) and run \`npx cdalkit sync\`.`,
      };
    }

    // Check if role is forbidden from touching tests (e.g. implementer)
    if (roleDef?.denyTests && isTestPath(rel)) {
      return {
        blocked: true,
        rule: 'role-test-write',
        reason: `Role "${role}" is physically prohibited from writing or editing test files (${rel}). The developer implementing the code cannot grade their own work.`,
      };
    }

    // Check if test-author attempts to write production code
    if (role === 'test-author' && !isTestPath(rel) && !rel.startsWith('.cdal/state/')) {
      return {
        blocked: true,
        rule: 'role-impl-write',
        reason: `Role "test-author" can only author tests. Production code modifications belong to the implementer role.`,
      };
    }

    // Check if path is within role's configured write scopes
    if (roleDef?.write && roleDef.write.length > 0) {
      if (!isPathInScope(rel, roleDef.write)) {
        return {
          blocked: true,
          rule: 'role-scope',
          reason: `Role "${role}" does not have write scope for "${rel}". Allowed scopes: ${roleDef.write.join(', ')}`,
        };
      }
    }
  }

  // 3. Forbidden Content Patterns
  const forbiddenRules: ForbiddenRule[] =
    config?.forbidden ?? (BUILTIN_PRESETS['typescript-strict']?.forbidden || []);

  for (const rule of forbiddenRules) {
    if (skipRules.includes(rule.id)) continue;

    // Check file scope applicability
    if (rule.appliesTo) {
      const appliesRe =
        rule.appliesTo instanceof RegExp ? rule.appliesTo : new RegExp(rule.appliesTo);
      if (!appliesRe.test(rel)) continue;
    }

    // Check allowed paths exceptions
    if (rule.allowIn?.some((allowed) => rel.includes(allowed))) {
      continue;
    }

    // Check pattern match
    const patternRe = rule.re instanceof RegExp ? rule.re : new RegExp(rule.re);
    const match = patternRe.exec(content);
    if (match) {
      const snippet = String(match[0]).slice(0, 50);
      return {
        blocked: true,
        rule: rule.id,
        reason: `[${rule.id}] ${rule.msg} (matched snippet: "${snippet}")`,
      };
    }
  }

  return { blocked: false };
}

export function checkBash(commandLine = '', options: CheckBashOptions = {}): GuardResult {
  const trimmed = commandLine.trim();
  if (!trimmed) return { blocked: false };

  const config = options.config;
  const extraRules = config?.bash.extra ?? [];
  const rules: BashRule[] = [...extraRules];

  if (config?.bash.preset !== 'none') {
    const safeDefaults = BUILTIN_PRESETS['safe-defaults']?.bashRules ?? [];
    rules.push(...safeDefaults);
  }

  for (const rule of rules) {
    const re = rule.re instanceof RegExp ? rule.re : new RegExp(rule.re);
    if (re.test(trimmed)) {
      return {
        blocked: true,
        rule: 'bash',
        reason: rule.msg,
      };
    }
  }

  return { blocked: false };
}
