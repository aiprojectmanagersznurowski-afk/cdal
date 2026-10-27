import { ContractRegistry } from '@cdal/core';
import { describe, expect, it } from 'vitest';
import {
  type PoliciesData,
  type RequirementsData,
  type StateMachineData,
  emitPolicies,
  emitRequirements,
  emitStateMachine,
  policies,
  policiesRules,
  requirements,
  requirementsRules,
  stateMachine,
  stateMachineRules,
} from '../src/index.js';

describe('Standard Contract Kinds (@cdal/kinds) (CDK-E1-KINDS)', () => {
  const dummyCtx = {
    get: () => undefined,
    contractsDir: 'contracts',
  };

  const dummyEmitCtx = {
    target: 'ts' as const,
    contractsDir: 'contracts',
    get: () => undefined,
  };

  describe('requirements kind', () => {
    // @REQ: CDAL-REQ-KIND-REQUIREMENTS
    it('creates kind definition with defaults', () => {
      const kind = requirements();
      expect(kind.id).toBe('requirements');
      expect(kind.files).toEqual(['requirements.contract.mjs']);
      expect(kind.rules.length).toBeGreaterThan(0);
      expect(kind.mutations.length).toBeGreaterThan(0);
    });

    it('loads valid requirements export and rejects invalid module', () => {
      const kind = requirements();
      const valid = kind.load({
        REQUIREMENTS: [
          {
            id: 'REQ-1',
            source: 'spec.md',
            statement: 'Must work',
            acceptance: ['pass'],
            status: 'DONE',
          },
        ],
      });
      expect(valid.requirements).toHaveLength(1);

      expect(() => kind.load({})).toThrowError(/must export an array "REQUIREMENTS"/);
    });

    it('validates REQ-UNIQUE-IDS rule', () => {
      const rule = requirementsRules.find((r) => r.id === 'REQ-UNIQUE-IDS');
      expect(rule).toBeDefined();

      const validData: RequirementsData = {
        requirements: [
          { id: 'R1', source: 's', statement: 'st', acceptance: ['a'], status: 'DONE' },
          { id: 'R2', source: 's', statement: 'st', acceptance: ['a'], status: 'TODO' },
        ],
      };
      expect(rule?.check(validData, dummyCtx)).toHaveLength(0);

      const dupData: RequirementsData = {
        requirements: [
          { id: 'R1', source: 's', statement: 'st', acceptance: ['a'], status: 'DONE' },
          { id: 'R1', source: 's', statement: 'st', acceptance: ['a'], status: 'TODO' },
        ],
      };
      const findings = rule?.check(dupData, dummyCtx);
      expect(findings?.[0]?.message).toContain('Duplicate requirement IDs detected: R1');
    });

    it('validates REQ-COMPLETE rule', () => {
      const rule = requirementsRules.find((r) => r.id === 'REQ-COMPLETE');
      expect(rule).toBeDefined();

      const invalidData: RequirementsData = {
        requirements: [{ id: '', source: '', statement: '', acceptance: [], status: 'DONE' }],
      };
      const findings = rule?.check(invalidData, dummyCtx);
      expect(findings?.length).toBeGreaterThanOrEqual(4);
    });

    it('validates REQ-STATUS-VALID rule', () => {
      const rule = requirementsRules.find((r) => r.id === 'REQ-STATUS-VALID');
      const invalidData: RequirementsData = {
        requirements: [
          {
            id: 'R1',
            source: 's',
            statement: 'st',
            acceptance: ['a'],
            status: 'INVALID' as unknown as 'DONE',
          },
        ],
      };
      const findings = rule?.check(invalidData, dummyCtx);
      expect(findings?.[0]?.message).toContain('invalid status "INVALID"');
    });

    it('validates REQ-PARENT-EXISTS rule', () => {
      const rule = requirementsRules.find((r) => r.id === 'REQ-PARENT-EXISTS');
      const invalidData: RequirementsData = {
        requirements: [
          {
            id: 'R2',
            source: 's',
            statement: 'st',
            acceptance: ['a'],
            status: 'TODO',
            parent: 'NON-EXISTENT',
          },
        ],
      };
      const findings = rule?.check(invalidData, dummyCtx);
      expect(findings?.[0]?.message).toContain('parent requirement "NON-EXISTENT" does not exist');
    });

    it('emits deterministic TypeScript and Markdown', () => {
      const data: RequirementsData = {
        requirements: [
          {
            id: 'REQ-1',
            source: 'spec.md',
            statement: 'Core statement',
            acceptance: ['Criteria A'],
            status: 'DONE',
            priority: 'HIGH',
          },
        ],
      };

      const tsFiles = emitRequirements(data, { ...dummyEmitCtx, target: 'ts' });
      expect(tsFiles[0]?.path).toBe('requirements.ts');
      expect(tsFiles[0]?.content).toContain('export type RequirementId =');
      expect(tsFiles[0]?.content).toContain("'REQ-1'");

      const mdFiles = emitRequirements(data, { ...dummyEmitCtx, target: 'docs' });
      expect(mdFiles[0]?.path).toBe('requirements.md');
      expect(mdFiles[0]?.content).toContain(
        '| **REQ-1** | `DONE` | HIGH | Core statement | 1. Criteria A |',
      );
    });
  });

  describe('state-machine kind', () => {
    // @REQ: CDAL-REQ-KIND-STATE-MACHINE
    it('creates kind definition with defaults', () => {
      const kind = stateMachine();
      expect(kind.id).toBe('state-machine');
      expect(kind.files).toEqual(['state-machine.contract.mjs']);
    });

    it('loads valid state machine module and rejects empty states', () => {
      const kind = stateMachine();
      const valid = kind.load({
        STATES: [{ id: 'IDLE' }],
        TRANSITIONS: [],
      });
      expect(valid.states).toHaveLength(1);
      expect(valid.startState).toBe('IDLE');

      expect(() => kind.load({})).toThrowError(/must export a non-empty array "STATES"/);
    });

    it('validates STATE-UNIQUE-IDS rule', () => {
      const rule = stateMachineRules.find((r) => r.id === 'STATE-UNIQUE-IDS');
      const dupData: StateMachineData = {
        startState: 'S1',
        states: [{ id: 'S1' }, { id: 'S1' }],
        transitions: [
          { id: 'T1', from: 'S1', to: 'S1', action: 'A', actor: 'ACT' },
          { id: 'T1', from: 'S1', to: 'S1', action: 'B', actor: 'ACT' },
        ],
        guards: [
          { id: 'G1', description: 'g' },
          { id: 'G1', description: 'g' },
        ],
        actors: ['ACT'],
      };
      const findings = rule?.check(dupData, dummyCtx);
      expect(findings?.some((f) => f.message.includes('STATES: duplicate'))).toBe(true);
      expect(findings?.some((f) => f.message.includes('TRANSITIONS: duplicate'))).toBe(true);
      expect(findings?.some((f) => f.message.includes('GUARDS: duplicate'))).toBe(true);
    });

    it('validates STATE-KNOWN-STATES and actors', () => {
      const rule = stateMachineRules.find((r) => r.id === 'STATE-KNOWN-STATES');
      const invalidData: StateMachineData = {
        startState: 'GHOST_START',
        states: [{ id: 'S1' }],
        transitions: [
          { id: 'T1', from: 'GHOST_FROM', to: 'GHOST_TO', action: 'ACT', actor: 'GHOST_ACTOR' },
        ],
        guards: [],
        actors: ['AUTHORIZED_ACTOR'],
      };
      const findings = rule?.check(invalidData, dummyCtx);
      expect(findings?.some((f) => f.message.includes('Start state "GHOST_START"'))).toBe(true);
      expect(
        findings?.some((f) => f.message.includes('unknown source state "from: GHOST_FROM"')),
      ).toBe(true);
      expect(
        findings?.some((f) => f.message.includes('unknown destination state "to: GHOST_TO"')),
      ).toBe(true);
      expect(findings?.some((f) => f.message.includes('unknown actor "GHOST_ACTOR"'))).toBe(true);
    });

    it('validates STATE-DETERMINISM', () => {
      const rule = stateMachineRules.find((r) => r.id === 'STATE-DETERMINISM');
      const nonDetData: StateMachineData = {
        startState: 'INIT',
        states: [{ id: 'INIT' }, { id: 'A' }, { id: 'B' }],
        transitions: [
          { id: 'T1', from: 'INIT', to: 'A', action: 'CLICK', actor: 'USER' },
          { id: 'T2', from: 'INIT', to: 'B', action: 'CLICK', actor: 'USER' },
        ],
        guards: [],
        actors: ['USER'],
      };
      const findings = rule?.check(nonDetData, dummyCtx);
      expect(findings?.[0]?.message).toContain('Non-deterministic state machine transition');
    });

    it('validates STATE-REACHABILITY via BFS', () => {
      const rule = stateMachineRules.find((r) => r.id === 'STATE-REACHABILITY');
      const unreachableData: StateMachineData = {
        startState: 'INIT',
        states: [{ id: 'INIT' }, { id: 'ISOLATED' }],
        transitions: [],
        guards: [],
        actors: [],
      };
      const findings = rule?.check(unreachableData, dummyCtx);
      expect(findings?.[0]?.message).toContain(
        'State "ISOLATED" is unreachable from start state "INIT"',
      );
    });

    it('validates STATE-NO-DEAD-ENDS', () => {
      const rule = stateMachineRules.find((r) => r.id === 'STATE-NO-DEAD-ENDS');
      const deadEndData: StateMachineData = {
        startState: 'ACTIVE',
        states: [
          { id: 'ACTIVE', terminal: false },
          { id: 'DONE', terminal: true },
        ],
        transitions: [{ id: 'T1', from: 'DONE', to: 'ACTIVE', action: 'REOPEN', actor: 'U' }],
        guards: [],
        actors: ['U'],
      };
      const findings = rule?.check(deadEndData, dummyCtx);
      expect(findings?.some((f) => f.message.includes('dead-end'))).toBe(true);
      expect(findings?.some((f) => f.severity === 'warn' && f.message.includes('terminal'))).toBe(
        true,
      );
    });

    it('validates STATE-SELF-LOOP-GUARD', () => {
      const rule = stateMachineRules.find((r) => r.id === 'STATE-SELF-LOOP-GUARD');
      const loopData: StateMachineData = {
        startState: 'LOOPING',
        states: [{ id: 'LOOPING' }],
        transitions: [{ id: 'T1', from: 'LOOPING', to: 'LOOPING', action: 'POLL', actor: 'SYS' }],
        guards: [],
        actors: ['SYS'],
      };
      const findings = rule?.check(loopData, dummyCtx);
      expect(findings?.[0]?.message).toContain(
        'must have at least one guard to prevent infinite loops',
      );
    });

    it('validates STATE-GUARDS-EXIST', () => {
      const rule = stateMachineRules.find((r) => r.id === 'STATE-GUARDS-EXIST');
      const missingGuardData: StateMachineData = {
        startState: 'INIT',
        states: [{ id: 'INIT' }],
        transitions: [
          {
            id: 'T1',
            from: 'INIT',
            to: 'INIT',
            action: 'NEXT',
            actor: 'SYS',
            guards: ['UNREGISTERED'],
          },
        ],
        guards: [],
        actors: ['SYS'],
      };
      const findings = rule?.check(missingGuardData, dummyCtx);
      expect(findings?.[0]?.message).toContain('references unregistered guard "UNREGISTERED"');
    });

    it('validates STATE-REQ-REFS cross-kind rule', () => {
      const rule = stateMachineRules.find((r) => r.id === 'STATE-REQ-REFS');
      const data: StateMachineData = {
        startState: 'INIT',
        states: [{ id: 'INIT' }],
        transitions: [
          { id: 'T1', from: 'INIT', to: 'INIT', action: 'A', actor: 'U', req: ['REQ-UNKNOWN'] },
        ],
        guards: [],
        actors: ['U'],
      };

      const ctxWithReqs = {
        get: <T>() => ({ requirements: [{ id: 'REQ-KNOWN' }] }) as unknown as T,
        contractsDir: 'contracts',
      };
      const findings = rule?.check(data, ctxWithReqs);
      expect(findings?.[0]?.message).toContain('references non-existent requirement "REQ-UNKNOWN"');
    });

    it('emits deterministic TypeScript and Mermaid markdown', () => {
      const data: StateMachineData = {
        startState: 'START',
        states: [{ id: 'START' }, { id: 'FINISHED', terminal: true }],
        transitions: [
          { id: 'T1', from: 'START', to: 'FINISHED', action: 'COMPLETE', actor: 'USER' },
        ],
        guards: [],
        actors: ['USER'],
      };

      const ts = emitStateMachine(data, { ...dummyEmitCtx, target: 'ts' });
      expect(ts[0]?.path).toBe('state-machine.ts');
      expect(ts[0]?.content).toContain("export const START_STATE = 'START'");

      const md = emitStateMachine(data, { ...dummyEmitCtx, target: 'docs' });
      expect(md[0]?.path).toBe('state-machine.mermaid.md');
      expect(md[0]?.content).toContain('stateDiagram-v2');
      expect(md[0]?.content).toContain('[*] --> START');
      expect(md[0]?.content).toContain('START --> FINISHED: COMPLETE');
      expect(md[0]?.content).toContain('FINISHED --> [*]');
    });
  });

  describe('policies kind', () => {
    // @REQ: CDAL-REQ-KIND-POLICIES
    it('creates kind definition with defaults', () => {
      const kind = policies();
      expect(kind.id).toBe('policies');
      expect(kind.files).toEqual(['policies.contract.mjs']);
    });

    it('loads valid policies module and rejects invalid export', () => {
      const kind = policies();
      const valid = kind.load({
        POLICIES: [{ id: 'P1', scope: 'global', description: 'd', unit: 'days', value: 10 }],
      });
      expect(valid.policies).toHaveLength(1);

      expect(() => kind.load({})).toThrowError(/must export an array "POLICIES"/);
    });

    it('validates POLICY-UNIQUE-IDS', () => {
      const rule = policiesRules.find((r) => r.id === 'POLICY-UNIQUE-IDS');
      const dupData: PoliciesData = {
        policies: [
          { id: 'P1', scope: 's', description: 'd', unit: 'days', value: 1 },
          { id: 'P1', scope: 's', description: 'd', unit: 'days', value: 2 },
        ],
      };
      const findings = rule?.check(dupData, dummyCtx);
      expect(findings?.[0]?.message).toContain('Duplicate policy IDs detected: P1');
    });

    it('validates POLICY-SHAPE (missing scope, unit, value)', () => {
      const rule = policiesRules.find((r) => r.id === 'POLICY-SHAPE');
      const brokenData: PoliciesData = {
        policies: [{ id: '', scope: '', description: '', unit: '' }],
      };
      const findings = rule?.check(brokenData, dummyCtx);
      expect(findings?.length).toBeGreaterThanOrEqual(4);
    });

    it('validates POLICY-BANDS-ORDER (strictly ascending)', () => {
      const rule = policiesRules.find((r) => r.id === 'POLICY-BANDS-ORDER');
      const unorderedData: PoliciesData = {
        policies: [
          {
            id: 'SLA',
            scope: 'tickets',
            description: 'desc',
            unit: 'hours',
            bands: [
              { name: 'NORMAL', max: 24 },
              { name: 'WARNING', max: 12 }, // Not ascending
            ],
          },
        ],
      };
      const findings = rule?.check(unorderedData, dummyCtx);
      expect(findings?.[0]?.message).toContain(
        'bands threshold steps must be strictly ascending (found 24 -> 12)',
      );
    });

    it('validates POLICY-REQ-REFS cross-kind check', () => {
      const rule = policiesRules.find((r) => r.id === 'POLICY-REQ-REFS');
      const data: PoliciesData = {
        policies: [
          {
            id: 'P1',
            scope: 's',
            description: 'd',
            unit: 'count',
            value: 5,
            req: ['NON-EXISTENT'],
          },
        ],
      };
      const ctx = {
        get: <T>() => ({ requirements: [{ id: 'EXISTING-REQ' }] }) as unknown as T,
        contractsDir: 'contracts',
      };
      const findings = rule?.check(data, ctx);
      expect(findings?.[0]?.message).toContain(
        'references non-existent requirement "NON-EXISTENT"',
      );
    });

    it('emits deterministic TypeScript and Markdown', () => {
      const data: PoliciesData = {
        policies: [
          {
            id: 'POLICY_TIMEOUT',
            scope: 'auth',
            description: 'Timeout in seconds',
            unit: 'seconds',
            value: 300,
            req: ['REQ-1'],
          },
        ],
      };

      const ts = emitPolicies(data, { ...dummyEmitCtx, target: 'ts' });
      expect(ts[0]?.path).toBe('policies.ts');
      expect(ts[0]?.content).toContain('export const POLICIES =');

      const md = emitPolicies(data, { ...dummyEmitCtx, target: 'docs' });
      expect(md[0]?.path).toBe('policies.md');
      expect(md[0]?.content).toContain('| **POLICY_TIMEOUT** | auth | `seconds` | 300 | `REQ-1` |');
    });
  });

  describe('Full Selftest Mutation Coverage across all OSS kinds', () => {
    it('verifies that every rule in every kind has at least one positive mutation probe', () => {
      const registry = new ContractRegistry();
      registry.register(requirements());
      registry.register(stateMachine());
      registry.register(policies());

      const coverage = registry.verifyMutationCoverage();
      expect(coverage.missing).toEqual([]);
      expect(coverage.valid).toBe(true);
    });
  });
});
