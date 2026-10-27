/**
 * Contract Kind Extension Model & Rule Engine Types (@cdal/core)
 */

export interface Finding {
  /** Unique ID of the rule triggering this finding */
  ruleId: string;
  /** Severity level */
  severity: 'error' | 'warn';
  /** Human-readable failure explanation */
  message: string;
  /** Contract file where violation occurred */
  file?: string;
  /** Approximate line number if available */
  line?: number;
  /** Approximate column number if available */
  column?: number;
}

export interface RuleCtx {
  /** Access parsed data of any other registered contract kind (for cross-contract rules) */
  get<T = unknown>(kindId: string): T | undefined;
  /** Resolved contracts directory path */
  contractsDir: string;
}

export interface Rule<TData = unknown> {
  /** Unique invariant identifier (e.g. 'REQ-UNIQUE-IDS', 'STATE-NO-DEAD-ENDS') */
  id: string;
  /** Invariant severity */
  severity: 'error' | 'warn';
  /** Checks invariant compliance and returns any findings */
  check(data: TData, ctx: RuleCtx): Finding[];
}

export interface Mutation {
  /** ID of the rule that MUST fail when this mutation is applied in selftest */
  rule: string;
  /** File relative to contractsDir to mutate */
  file: string;
  /** String or regex to search for in contract file */
  find: string | RegExp;
  /** Replacement text causing the intentional invariant break */
  replace: string;
}

export interface GeneratedFile {
  /** Target relative path (e.g. 'requirements.ts' or 'order-flow.mermaid.md') */
  path: string;
  /** Deterministic file content (with stable banners, sorted keys) */
  content: string;
}

export interface EmitCtx {
  /** Emission target */
  target: 'ts' | 'docs';
  /** Resolved contracts directory path */
  contractsDir: string;
  /** Access parsed data of other contract kinds */
  get<T = unknown>(kindId: string): T | undefined;
}

import type { ContractKindDefinition } from '../config/types.js';

export interface ContractKind<TData = unknown> extends ContractKindDefinition {
  /** Unique identifier for this contract kind (e.g. 'requirements', 'state-machine', 'policies') */
  id: string;
  /** File globs or patterns relative to contractsDir that belong to this kind */
  files: string[];
  /** Loads module exports, validates schema shape and returns typed data */
  load(mod: Record<string, unknown>, filePath?: string): TData;
  /** Invariant rules enforced against this kind's data */
  rules: Rule<TData>[];
  /** Optional deterministic code and documentation generator */
  emit?(data: TData, ctx: EmitCtx): GeneratedFile[];
  /** Selftest mutation probes (every rule must have at least one mutation) */
  mutations: Mutation[];
}

/**
 * Type-safe helper for authoring custom contract kinds
 */
export function defineKind<TData>(kind: ContractKind<TData>): ContractKind<TData> {
  return kind;
}
