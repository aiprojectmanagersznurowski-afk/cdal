import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { type ContractKind, ContractRegistry, type Finding, defineKind } from '../src/index.js';

describe('Contract Kind Extension Model & Registry (CDK-E1-KIND-API)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cdal-kind-api-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // @REQ: CDAL-REQ-KINDS
  it('defineKind returns the exact kind definition', () => {
    const kind = defineKind({
      id: 'custom',
      files: ['custom.contract.mjs'],
      load: () => ({}),
      rules: [],
      mutations: [],
    });
    expect(kind.id).toBe('custom');
  });

  it('ContractRegistry registers kinds and rejects duplicates', () => {
    const registry = new ContractRegistry();
    const kind = defineKind({
      id: 'custom-1',
      files: ['*.contract.mjs'],
      load: () => ({}),
      rules: [],
      mutations: [],
    });

    registry.register(kind);
    expect(registry.get('custom-1')).toBe(kind);
    expect(registry.getAll()).toHaveLength(1);

    expect(() => registry.register(kind)).toThrowError(/already registered/);
  });

  it('verifies mutation coverage: fails if a rule has no mutation probe', () => {
    const registry = new ContractRegistry();
    const incompleteKind = defineKind({
      id: 'incomplete',
      files: ['incomplete.contract.mjs'],
      load: () => ({}),
      rules: [
        {
          id: 'RULE-WITH-MUTATION',
          severity: 'error',
          check: () => [],
        },
        {
          id: 'RULE-WITHOUT-MUTATION',
          severity: 'error',
          check: () => [],
        },
      ],
      mutations: [
        {
          rule: 'RULE-WITH-MUTATION',
          file: 'incomplete.contract.mjs',
          find: 'foo',
          replace: 'bar',
        },
      ],
    });

    registry.register(incompleteKind);
    const coverage = registry.verifyMutationCoverage();
    expect(coverage.valid).toBe(false);
    expect(coverage.missing).toContain('incomplete:RULE-WITHOUT-MUTATION');
  });

  it('executes custom kind lifecycle (load, rule check, emit)', async () => {
    const contractsDir = path.join(tmpDir, 'contracts');
    fs.mkdirSync(contractsDir, { recursive: true });

    const contractFilePath = path.join(contractsDir, 'status.contract.mjs');
    fs.writeFileSync(
      contractFilePath,
      `export const STATUSES = ['PENDING', 'ACTIVE', 'COMPLETED'];`,
      'utf8',
    );

    interface StatusData {
      statuses: string[];
    }

    const statusKind: ContractKind<StatusData> = {
      id: 'statuses',
      files: ['status.contract.mjs'],
      load(mod): StatusData {
        if (!Array.isArray(mod.STATUSES)) {
          throw new Error('STATUSES must be an array');
        }
        return { statuses: mod.STATUSES as string[] };
      },
      rules: [
        {
          id: 'STATUS-MINIMUM-COUNT',
          severity: 'error',
          check(data): Finding[] {
            if (data.statuses.length < 2) {
              return [
                {
                  ruleId: 'STATUS-MINIMUM-COUNT',
                  severity: 'error',
                  message: 'Must declare at least 2 statuses',
                },
              ];
            }
            return [];
          },
        },
      ],
      emit(data, ctx) {
        if (ctx.target === 'ts') {
          return [
            {
              path: 'statuses.ts',
              content: `export type Status = ${data.statuses.map((s) => `'${s}'`).join(' | ')};\n`,
            },
          ];
        }
        return [];
      },
      mutations: [
        {
          rule: 'STATUS-MINIMUM-COUNT',
          file: 'status.contract.mjs',
          find: "'ACTIVE', 'COMPLETED'",
          replace: '',
        },
      ],
    };

    const registry = new ContractRegistry();
    registry.register(statusKind);

    const findings = await registry.validate('contracts', tmpDir);
    expect(findings).toEqual([]);

    const emitted = await registry.emit('ts', 'contracts', tmpDir);
    expect(emitted).toHaveLength(1);
    expect(emitted[0]?.path).toBe('statuses.ts');
    expect(emitted[0]?.content).toBe("export type Status = 'PENDING' | 'ACTIVE' | 'COMPLETED';\n");
  });

  it('supports cross-kind invariant validation via ctx.get(kindId)', async () => {
    const contractsDir = path.join(tmpDir, 'contracts');
    fs.mkdirSync(contractsDir, { recursive: true });

    fs.writeFileSync(
      path.join(contractsDir, 'users.contract.mjs'),
      `export const ROLES = ['admin', 'viewer'];`,
      'utf8',
    );

    fs.writeFileSync(
      path.join(contractsDir, 'actions.contract.mjs'),
      `export const ACTIONS = [{ id: 'delete_post', requiredRole: 'superadmin' }];`,
      'utf8',
    );

    const usersKind: ContractKind<{ roles: string[] }> = {
      id: 'users',
      files: ['users.contract.mjs'],
      load: (mod) => ({ roles: (mod.ROLES as string[]) || [] }),
      rules: [],
      mutations: [],
    };

    const actionsKind: ContractKind<{ actions: Array<{ id: string; requiredRole: string }> }> = {
      id: 'actions',
      files: ['actions.contract.mjs'],
      load: (mod) => ({
        actions: (mod.ACTIONS as Array<{ id: string; requiredRole: string }>) || [],
      }),
      rules: [
        {
          id: 'ACTION-ROLE-MUST-EXIST',
          severity: 'error',
          check(data, ctx): Finding[] {
            const users = ctx.get<{ roles: string[] }>('users');
            if (!users) return [];
            const findings: Finding[] = [];
            for (const a of data.actions) {
              if (!users.roles.includes(a.requiredRole)) {
                findings.push({
                  ruleId: 'ACTION-ROLE-MUST-EXIST',
                  severity: 'error',
                  message: `Action "${a.id}" references unknown role "${a.requiredRole}"`,
                });
              }
            }
            return findings;
          },
        },
      ],
      mutations: [
        {
          rule: 'ACTION-ROLE-MUST-EXIST',
          file: 'actions.contract.mjs',
          find: 'admin',
          replace: 'ghost',
        },
      ],
    };

    const registry = new ContractRegistry();
    registry.register(usersKind);
    registry.register(actionsKind);

    const findings = await registry.validate('contracts', tmpDir);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.ruleId).toBe('ACTION-ROLE-MUST-EXIST');
    expect(findings[0]?.message).toContain('references unknown role "superadmin"');
  });
});
