import { BUILTIN_PRESETS, isKnownPreset } from './presets.js';
import type { CdalConfig, ForbiddenRule, ResolvedCdalConfig, RoleDefinition } from './types.js';

export class CdalConfigError extends Error {
  public readonly errors: string[];

  constructor(message: string, errors: string[] = []) {
    super(message);
    this.name = 'CdalConfigError';
    this.errors = errors;
  }
}

function isValidRegex(pattern: string | RegExp): boolean {
  if (pattern instanceof RegExp) return true;
  if (typeof pattern !== 'string') return false;
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
}

function isValidGlobOrPath(pathStr: string): boolean {
  if (typeof pathStr !== 'string') return false;
  const trimmed = pathStr.trim();
  if (trimmed.length === 0) return false;
  // Disallow obvious invalid tokens like unclosed brackets [ without ]
  const openBracket = (trimmed.match(/\[/g) || []).length;
  const closeBracket = (trimmed.match(/\]/g) || []).length;
  if (openBracket !== closeBracket) return false;
  return true;
}

export function validateConfig(raw: unknown): asserts raw is CdalConfig {
  const errors: string[] = [];

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new CdalConfigError('Invalid cdal.config.mjs: configuration must export an object.', [
      'Configuration root is not a valid object.',
    ]);
  }

  const config = raw as Record<string, unknown>;

  // Validate contractsDir
  if (config.contractsDir !== undefined) {
    if (typeof config.contractsDir !== 'string' || config.contractsDir.trim() === '') {
      errors.push('contractsDir must be a non-empty string path.');
    } else if (config.contractsDir.startsWith('/')) {
      errors.push(
        `contractsDir "${config.contractsDir}" must be a relative path within the workspace.`,
      );
    }
  }

  // Validate generated
  if (config.generated !== undefined) {
    if (
      !config.generated ||
      typeof config.generated !== 'object' ||
      Array.isArray(config.generated)
    ) {
      errors.push('generated must be an object containing "ts" and/or "docs" paths.');
    } else {
      const gen = config.generated as Record<string, unknown>;
      if (gen.ts !== undefined && (typeof gen.ts !== 'string' || gen.ts.trim() === '')) {
        errors.push('generated.ts must be a non-empty string path.');
      }
      if (gen.docs !== undefined && (typeof gen.docs !== 'string' || gen.docs.trim() === '')) {
        errors.push('generated.docs must be a non-empty string path.');
      }
    }
  }

  // Validate kinds
  if (config.kinds !== undefined) {
    if (!Array.isArray(config.kinds)) {
      errors.push('kinds must be an array of ContractKind definitions.');
    } else {
      for (let i = 0; i < config.kinds.length; i++) {
        const kind = config.kinds[i];
        if (!kind || typeof kind !== 'object' || Array.isArray(kind)) {
          errors.push(`kinds[${i}] must be an object.`);
        } else {
          const kindObj = kind as Record<string, unknown>;
          if (typeof kindObj.id !== 'string' || kindObj.id.trim() === '') {
            errors.push(`kinds[${i}] is missing a required non-empty string "id".`);
          }
        }
      }
    }
  }

  // Validate presets
  if (config.presets !== undefined) {
    if (!Array.isArray(config.presets)) {
      errors.push('presets must be an array of preset name strings.');
    } else {
      const known = Object.keys(BUILTIN_PRESETS).join(', ');
      for (const preset of config.presets) {
        if (typeof preset !== 'string' || !isKnownPreset(preset)) {
          errors.push(`Unknown preset "${preset}". Known presets are: ${known}.`);
        }
      }
    }
  }

  // Validate protectedPaths
  if (config.protectedPaths !== undefined) {
    if (!Array.isArray(config.protectedPaths)) {
      errors.push('protectedPaths must be an array of path/glob strings.');
    } else {
      for (let i = 0; i < config.protectedPaths.length; i++) {
        const p = config.protectedPaths[i];
        if (typeof p !== 'string' || !isValidGlobOrPath(p)) {
          errors.push(`protectedPaths[${i}] contains an invalid path or glob pattern: "${p}".`);
        }
      }
    }
  }

  // Validate roles
  if (config.roles !== undefined) {
    if (!config.roles || typeof config.roles !== 'object' || Array.isArray(config.roles)) {
      errors.push('roles must be an object mapping role names to their definitions.');
    } else {
      for (const [roleName, roleDef] of Object.entries(config.roles)) {
        if (!roleDef || typeof roleDef !== 'object' || Array.isArray(roleDef)) {
          errors.push(`roles["${roleName}"] must be an object with a "write" array.`);
        } else {
          const def = roleDef as Record<string, unknown>;
          if (!Array.isArray(def.write)) {
            errors.push(`roles["${roleName}"].write must be an array of path or glob strings.`);
          } else {
            for (let j = 0; j < def.write.length; j++) {
              const scope = def.write[j];
              if (typeof scope !== 'string' || !isValidGlobOrPath(scope)) {
                errors.push(
                  `roles["${roleName}"].write[${j}] has invalid glob or empty path: "${scope}".`,
                );
              }
            }
          }
          if (def.denyTests !== undefined && typeof def.denyTests !== 'boolean') {
            errors.push(`roles["${roleName}"].denyTests must be a boolean if specified.`);
          }
        }
      }
    }
  }

  // Validate forbidden
  if (config.forbidden !== undefined) {
    if (!Array.isArray(config.forbidden)) {
      errors.push('forbidden must be an array of ForbiddenRule objects.');
    } else {
      for (let i = 0; i < config.forbidden.length; i++) {
        const item = config.forbidden[i];
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
          errors.push(`forbidden[${i}] must be an object.`);
        } else {
          const rule = item as Record<string, unknown>;
          if (typeof rule.id !== 'string' || rule.id.trim() === '') {
            errors.push(`forbidden[${i}] must have a non-empty string "id".`);
          }
          if (!rule.re || !isValidRegex(rule.re as string | RegExp)) {
            errors.push(`forbidden[${i}] ("${rule.id || i}") has an invalid regex in "re".`);
          }
          if (typeof rule.msg !== 'string' || rule.msg.trim() === '') {
            errors.push(`forbidden[${i}] ("${rule.id || i}") must have a non-empty "msg".`);
          }
          if (rule.appliesTo !== undefined && !isValidRegex(rule.appliesTo as string | RegExp)) {
            errors.push(`forbidden[${i}] ("${rule.id || i}") has an invalid regex in "appliesTo".`);
          }
          if (rule.allowIn !== undefined && !Array.isArray(rule.allowIn)) {
            errors.push(
              `forbidden[${i}] ("${rule.id || i}") "allowIn" must be an array of strings.`,
            );
          }
        }
      }
    }
  }

  // Validate bash
  if (config.bash !== undefined) {
    if (!config.bash || typeof config.bash !== 'object' || Array.isArray(config.bash)) {
      errors.push('bash must be an object specifying "preset" and/or "extra" rules.');
    } else {
      const bash = config.bash as Record<string, unknown>;
      if (bash.preset !== undefined && bash.preset !== 'safe-defaults' && bash.preset !== 'none') {
        errors.push('bash.preset must be either "safe-defaults" or "none".');
      }
      if (bash.extra !== undefined) {
        if (!Array.isArray(bash.extra)) {
          errors.push('bash.extra must be an array of bash rules.');
        } else {
          for (let i = 0; i < bash.extra.length; i++) {
            const extraRule = bash.extra[i];
            if (!extraRule || typeof extraRule !== 'object' || Array.isArray(extraRule)) {
              errors.push(`bash.extra[${i}] must be an object.`);
            } else {
              const rule = extraRule as Record<string, unknown>;
              if (!rule.re || !isValidRegex(rule.re as string | RegExp)) {
                errors.push(`bash.extra[${i}] has an invalid regex pattern in "re".`);
              }
              if (typeof rule.msg !== 'string' || rule.msg.trim() === '') {
                errors.push(`bash.extra[${i}] must have a non-empty "msg" string.`);
              }
            }
          }
        }
      }
    }
  }

  // Validate verify
  if (config.verify !== undefined) {
    if (!Array.isArray(config.verify)) {
      errors.push('verify must be an array of command strings.');
    } else {
      for (let i = 0; i < config.verify.length; i++) {
        if (typeof config.verify[i] !== 'string' || (config.verify[i] as string).trim() === '') {
          errors.push(`verify[${i}] must be a non-empty command string.`);
        }
      }
    }
  }

  // Validate runtimes
  if (config.runtimes !== undefined) {
    if (!Array.isArray(config.runtimes)) {
      errors.push('runtimes must be an array of runtime identifier strings.');
    }
  }

  if (errors.length > 0) {
    const message = `CDAL configuration validation failed with ${errors.length} error(s):\n  - ${errors.join('\n  - ')}`;
    throw new CdalConfigError(message, errors);
  }
}

export function resolveConfig(config: CdalConfig): ResolvedCdalConfig {
  validateConfig(config);

  const presets = config.presets ?? [];
  const presetForbidden: ForbiddenRule[] = [];
  const presetProtected: string[] = [];

  for (const presetName of presets) {
    const p = BUILTIN_PRESETS[presetName];
    if (p) {
      if (p.forbidden) presetForbidden.push(...p.forbidden);
      if (p.protectedPaths) presetProtected.push(...p.protectedPaths);
    }
  }

  const defaultRoles: Record<string, RoleDefinition> = {
    'spec-analyst': { write: ['docs/workorders/', '.cdal/state/'] },
    'test-author': { write: ['**/*.test.ts', '**/*.test.tsx', 'tests/', 'e2e/', '.cdal/state/'] },
    implementer: { write: ['src/', 'app/', 'packages/', '.cdal/state/'], denyTests: true },
    reviewer: { write: ['.cdal/memory/'] },
  };

  const contractsDir = config.contractsDir ?? 'contracts';
  const generatedTs = config.generated?.ts ?? 'src/generated/contracts';
  const generatedDocs = config.generated?.docs ?? 'docs/generated';

  const defaultProtectedPaths = [`${contractsDir}/`, `${generatedTs}/`];

  return {
    contractsDir,
    generated: {
      ts: generatedTs,
      docs: generatedDocs,
    },
    kinds: config.kinds ?? [],
    protectedPaths: Array.from(
      new Set([...defaultProtectedPaths, ...presetProtected, ...(config.protectedPaths ?? [])]),
    ),
    roles: config.roles ?? defaultRoles,
    presets,
    forbidden: [...presetForbidden, ...(config.forbidden ?? [])],
    bash: {
      preset: config.bash?.preset ?? 'safe-defaults',
      extra: config.bash?.extra ?? [],
    },
    verify: config.verify ?? [
      'cdal validate --strict',
      'cdal codegen --check',
      'cdal trace --enforce',
      'cdal selftest',
    ],
    runtimes: config.runtimes ?? ['claude-code', 'agents-md'],
  };
}
