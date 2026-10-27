import type { ContractKind, EmitCtx, Finding, GeneratedFile, Mutation, Rule } from '@cdal/core';

export interface State {
  id: string;
  name?: string;
  terminal?: boolean;
  kind?: string;
}

export interface Transition {
  id: string;
  from: string;
  to: string;
  action: string;
  actor: string;
  guards?: string[];
  effects?: string[];
  req?: string[];
}

export interface Guard {
  id: string;
  description: string;
}

export interface StateMachineData {
  startState: string;
  states: State[];
  transitions: Transition[];
  guards: Guard[];
  actors: string[];
}

const findDuplicates = (arr: string[]): string[] => {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const item of arr) {
    if (seen.has(item)) dupes.add(item);
    else seen.add(item);
  }
  return Array.from(dupes);
};

export const stateMachineRules: Rule<StateMachineData>[] = [
  {
    id: 'STATE-UNIQUE-IDS',
    severity: 'error',
    check(data): Finding[] {
      const findings: Finding[] = [];
      const stateDupes = findDuplicates(data.states.map((s) => s.id));
      if (stateDupes.length > 0) {
        findings.push({
          ruleId: 'STATE-UNIQUE-IDS',
          severity: 'error',
          message: `STATES: duplicate IDs detected: ${stateDupes.join(', ')}`,
        });
      }

      const transDupes = findDuplicates(data.transitions.map((t) => t.id));
      if (transDupes.length > 0) {
        findings.push({
          ruleId: 'STATE-UNIQUE-IDS',
          severity: 'error',
          message: `TRANSITIONS: duplicate IDs detected: ${transDupes.join(', ')}`,
        });
      }

      const guardDupes = findDuplicates(data.guards.map((g) => g.id));
      if (guardDupes.length > 0) {
        findings.push({
          ruleId: 'STATE-UNIQUE-IDS',
          severity: 'error',
          message: `GUARDS: duplicate IDs detected: ${guardDupes.join(', ')}`,
        });
      }

      return findings;
    },
  },
  {
    id: 'STATE-KNOWN-STATES',
    severity: 'error',
    check(data): Finding[] {
      const findings: Finding[] = [];
      const stateIds = new Set(data.states.map((s) => s.id));
      const actors = new Set(data.actors);

      if (!stateIds.has(data.startState)) {
        findings.push({
          ruleId: 'STATE-KNOWN-STATES',
          severity: 'error',
          message: `Start state "${data.startState}" is not defined in STATES.`,
        });
      }

      for (const t of data.transitions) {
        if (!stateIds.has(t.from)) {
          findings.push({
            ruleId: 'STATE-KNOWN-STATES',
            severity: 'error',
            message: `Transition "${t.id}": unknown source state "from: ${t.from}".`,
          });
        }
        if (!stateIds.has(t.to)) {
          findings.push({
            ruleId: 'STATE-KNOWN-STATES',
            severity: 'error',
            message: `Transition "${t.id}": unknown destination state "to: ${t.to}".`,
          });
        }
        if (data.actors.length > 0 && !actors.has(t.actor)) {
          findings.push({
            ruleId: 'STATE-KNOWN-STATES',
            severity: 'error',
            message: `Transition "${t.id}": unknown actor "${t.actor}".`,
          });
        }
      }

      return findings;
    },
  },
  {
    id: 'STATE-DETERMINISM',
    severity: 'error',
    check(data): Finding[] {
      const findings: Finding[] = [];
      const pairs = data.transitions.map((t) => `${t.from}::${t.action}`);
      const dupes = findDuplicates(pairs);
      for (const d of dupes) {
        const [from, action] = d.split('::');
        findings.push({
          ruleId: 'STATE-DETERMINISM',
          severity: 'error',
          message: `Non-deterministic state machine transition: multiple transitions from state "${from}" on action "${action}".`,
        });
      }
      return findings;
    },
  },
  {
    id: 'STATE-REACHABILITY',
    severity: 'error',
    check(data): Finding[] {
      const findings: Finding[] = [];
      const adj = new Map<string, string[]>();

      for (const t of data.transitions) {
        if (!adj.has(t.from)) adj.set(t.from, []);
        adj.get(t.from)?.push(t.to);
      }

      const reachable = new Set<string>([data.startState]);
      const queue: string[] = [data.startState];

      while (queue.length > 0) {
        const current = queue.shift();
        if (!current) continue;
        for (const next of adj.get(current) || []) {
          if (!reachable.has(next)) {
            reachable.add(next);
            queue.push(next);
          }
        }
      }

      for (const s of data.states) {
        if (!reachable.has(s.id)) {
          findings.push({
            ruleId: 'STATE-REACHABILITY',
            severity: 'error',
            message: `State "${s.id}" is unreachable from start state "${data.startState}".`,
          });
        }
      }

      return findings;
    },
  },
  {
    id: 'STATE-NO-DEAD-ENDS',
    severity: 'error',
    check(data): Finding[] {
      const findings: Finding[] = [];
      for (const s of data.states) {
        const out = data.transitions.filter((t) => t.from === s.id);
        if (!s.terminal && out.length === 0) {
          findings.push({
            ruleId: 'STATE-NO-DEAD-ENDS',
            severity: 'error',
            message: `State "${s.id}" is non-terminal but has zero outgoing transitions (dead-end).`,
          });
        }
        if (s.terminal && out.length > 0) {
          findings.push({
            ruleId: 'STATE-NO-DEAD-ENDS',
            severity: 'warn',
            message: `State "${s.id}" is marked as terminal but has ${out.length} outgoing transition(s).`,
          });
        }
      }
      return findings;
    },
  },
  {
    id: 'STATE-SELF-LOOP-GUARD',
    severity: 'error',
    check(data): Finding[] {
      const findings: Finding[] = [];
      for (const t of data.transitions) {
        if (t.from === t.to && (!t.guards || t.guards.length === 0)) {
          findings.push({
            ruleId: 'STATE-SELF-LOOP-GUARD',
            severity: 'error',
            message: `Self-transition "${t.id}" (${t.from} -> ${t.to}) must have at least one guard to prevent infinite loops.`,
          });
        }
      }
      return findings;
    },
  },
  {
    id: 'STATE-GUARDS-EXIST',
    severity: 'error',
    check(data): Finding[] {
      const findings: Finding[] = [];
      const guardIds = new Set(data.guards.map((g) => g.id));
      for (const t of data.transitions) {
        for (const g of t.guards || []) {
          if (!guardIds.has(g)) {
            findings.push({
              ruleId: 'STATE-GUARDS-EXIST',
              severity: 'error',
              message: `Transition "${t.id}": references unregistered guard "${g}".`,
            });
          }
        }
      }
      return findings;
    },
  },
  {
    id: 'STATE-REQ-REFS',
    severity: 'error',
    check(data, ctx): Finding[] {
      const findings: Finding[] = [];
      const reqs = ctx.get<{ requirements: Array<{ id: string }> }>('requirements');
      if (!reqs) return [];

      const knownReqIds = new Set(reqs.requirements.map((r) => r.id));
      for (const t of data.transitions) {
        for (const reqId of t.req || []) {
          if (!knownReqIds.has(reqId)) {
            findings.push({
              ruleId: 'STATE-REQ-REFS',
              severity: 'error',
              message: `Transition "${t.id}": references non-existent requirement "${reqId}".`,
            });
          }
        }
      }
      return findings;
    },
  },
];

export const stateMachineMutations: Mutation[] = [
  {
    rule: 'STATE-UNIQUE-IDS',
    file: 'state-machine.contract.mjs',
    find: /(id:\s*['"]([A-Za-z0-9_-]+)['"][\s\S]*?id:\s*['"])[A-Za-z0-9_-]+(['"])/,
    replace: '$1$2$3',
  },
  {
    rule: 'STATE-KNOWN-STATES',
    file: 'state-machine.contract.mjs',
    find: /to:\s*['"][A-Za-z0-9_-]+['"]/,
    replace: "to: 'NON_EXISTENT_STATE'",
  },
  {
    rule: 'STATE-DETERMINISM',
    file: 'state-machine.contract.mjs',
    find: /(action:\s*['"]([A-Za-z0-9_-]+)['"][\s\S]*?action:\s*['"])[A-Za-z0-9_-]+(['"])/,
    replace: '$1$2$3',
  },
  {
    rule: 'STATE-REACHABILITY',
    file: 'state-machine.contract.mjs',
    find: /export const START_STATE\s*=\s*['"][^'"]+['"]/,
    replace: "export const START_STATE = 'ISOLATED_UNREACHABLE_STATE'",
  },
  {
    rule: 'STATE-NO-DEAD-ENDS',
    file: 'state-machine.contract.mjs',
    find: /terminal:\s*true/,
    replace: 'terminal: false',
  },
  {
    rule: 'STATE-SELF-LOOP-GUARD',
    file: 'state-machine.contract.mjs',
    find: /to:\s*['"]CANCELLED['"]/,
    replace: "to: 'DRAFT'",
  },
  {
    rule: 'STATE-GUARDS-EXIST',
    file: 'state-machine.contract.mjs',
    find: /guards:\s*\[['"]([^'"]+)['"]\]/,
    replace: "guards: ['NON_EXISTENT_GUARD']",
  },
  {
    rule: 'STATE-REQ-REFS',
    file: 'state-machine.contract.mjs',
    find: /req:\s*\[['"]([^'"]+)['"]\]/,
    replace: "req: ['NON_EXISTENT_REQ_ID']",
  },
];

export function emitStateMachine(data: StateMachineData, ctx: EmitCtx): GeneratedFile[] {
  if (ctx.target === 'ts') {
    const stateIds = data.states.map((s) => `  | '${s.id}'`).join('\n');
    const transitionIds = data.transitions.map((t) => `  | '${t.id}'`).join('\n');

    const content = `// @generated by CDAL (Contract-Driven Agentic Loop)
// Do not edit manually - changes will be overwritten by 'cdal codegen'.

export type StateId =
${stateIds};

export type TransitionId =
${transitionIds};

export const START_STATE = '${data.startState}' as const;
export const STATES = ${JSON.stringify(data.states, null, 2)} as const;
export const TRANSITIONS = ${JSON.stringify(data.transitions, null, 2)} as const;
`;
    return [{ path: 'state-machine.ts', content }];
  }

  if (ctx.target === 'docs') {
    let md = '# State Machine Diagram\n\n```mermaid\nstateDiagram-v2\n';
    md += `  [*] --> ${data.startState}\n`;
    for (const t of data.transitions) {
      const label = t.action ? `: ${t.action}` : '';
      md += `  ${t.from} --> ${t.to}${label}\n`;
    }
    for (const s of data.states) {
      if (s.terminal) {
        md += `  ${s.id} --> [*]\n`;
      }
    }
    md += '```\n';
    return [{ path: 'state-machine.mermaid.md', content: md }];
  }

  return [];
}

export function stateMachine(options?: { file?: string }): ContractKind<StateMachineData> {
  const file = options?.file ?? 'state-machine.contract.mjs';

  return {
    id: 'state-machine',
    files: [file],
    load(mod): StateMachineData {
      const states = (mod.STATES ?? []) as State[];
      const transitions = (mod.TRANSITIONS ?? []) as Transition[];
      const guards = (mod.GUARDS ?? []) as Guard[];
      const actors = (mod.ACTORS ?? []) as string[];
      const startState = (mod.START_STATE ?? (states[0]?.id || '')) as string;

      if (!Array.isArray(states) || states.length === 0) {
        throw new Error('state-machine contract must export a non-empty array "STATES".');
      }

      return {
        startState,
        states,
        transitions,
        guards,
        actors,
      };
    },
    rules: stateMachineRules,
    emit: emitStateMachine,
    mutations: stateMachineMutations.map((m) => ({ ...m, file })),
  };
}
