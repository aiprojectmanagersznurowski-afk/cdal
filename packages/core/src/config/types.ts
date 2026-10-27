/**
 * Configuration types for CDAL Kit (@cdal/core)
 */

export interface RoleDefinition {
  /** Paths and globs this role is authorized to write/edit */
  write: string[];
  /** When true, physically blocks this role from creating or modifying test files */
  denyTests?: boolean;
}

export interface ForbiddenRule {
  /** Unique identifier for the forbidden pattern rule */
  id: string;
  /** Regular expression pattern or string to detect forbidden code */
  re: string | RegExp;
  /** File pattern regex where this rule applies (default: all files) */
  appliesTo?: string | RegExp;
  /** Human-readable explanation and remediation instructions */
  msg: string;
  /** Files or paths permitted to contain this pattern (e.g. tests or config) */
  allowIn?: string[];
  /** If true, allow in write-hook check during staging */
  allowInWriteHook?: boolean;
}

export interface BashRule {
  /** Regex pattern to intercept in agent shell tool executions */
  re: string | RegExp;
  /** Human-readable reason why this command is blocked */
  msg: string;
}

export interface BashConfig {
  /** Preset for shell safety guards (default: 'safe-defaults') */
  preset?: 'safe-defaults' | 'none';
  /** Additional custom forbidden bash patterns */
  extra?: BashRule[];
}

export interface ContractKindDefinition {
  id: string;
  files?: string[];
  [key: string]: unknown;
}

export interface CdalConfig {
  /** Directory containing *.contract.mjs files (default: 'contracts') */
  contractsDir?: string;
  /** Output locations for generated code and documentation */
  generated?: {
    ts?: string;
    docs?: string;
  };
  /** Registered contract kinds (e.g. requirements, state-machine, policies) */
  kinds?: ContractKindDefinition[];
  /** Paths requiring an open contract window to modify */
  protectedPaths?: string[];
  /** Role-based agent permissions and scopes */
  roles?: Record<string, RoleDefinition>;
  /** Presets applied to configuration (e.g. 'typescript-strict', 'nextjs') */
  presets?: string[];
  /** Custom forbidden code patterns */
  forbidden?: ForbiddenRule[];
  /** Shell command interception configuration */
  bash?: BashConfig;
  /** Verification pipeline command steps */
  verify?: string[];
  /** Active agent runtime targets */
  runtimes?: string[];
}

export interface ResolvedCdalConfig {
  contractsDir: string;
  generated: {
    ts: string;
    docs: string;
  };
  kinds: ContractKindDefinition[];
  protectedPaths: string[];
  roles: Record<string, RoleDefinition>;
  presets: string[];
  forbidden: ForbiddenRule[];
  bash: {
    preset: 'safe-defaults' | 'none';
    extra: BashRule[];
  };
  verify: string[];
  runtimes: string[];
}
