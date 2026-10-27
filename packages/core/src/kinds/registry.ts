import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { ContractKind, EmitCtx, Finding, GeneratedFile, RuleCtx } from './types.js';

export class ContractRegistry {
  private kinds = new Map<string, ContractKind<unknown>>();

  /**
   * Register a contract kind into the registry
   */
  public register<TData>(kind: ContractKind<TData>): void {
    if (!kind || typeof kind.id !== 'string' || kind.id.trim() === '') {
      throw new Error('ContractKind must have a valid non-empty string "id".');
    }
    if (this.kinds.has(kind.id)) {
      throw new Error(`ContractKind with id "${kind.id}" is already registered.`);
    }
    this.kinds.set(kind.id, kind as ContractKind<unknown>);
  }

  /**
   * Retrieve a registered contract kind
   */
  public get<TData = unknown>(id: string): ContractKind<TData> | undefined {
    return this.kinds.get(id) as ContractKind<TData> | undefined;
  }

  /**
   * Return all registered contract kinds
   */
  public getAll(): ContractKind<unknown>[] {
    return Array.from(this.kinds.values());
  }

  /**
   * Discover and load all contract files for registered kinds
   */
  public async loadAll(
    contractsDir: string,
    cwd: string = process.cwd(),
  ): Promise<{
    data: Map<string, unknown>;
    filesByKind: Map<string, string[]>;
    loadFindings: Finding[];
  }> {
    const absContractsDir = path.resolve(cwd, contractsDir);
    const data = new Map<string, unknown>();
    const filesByKind = new Map<string, string[]>();
    const loadFindings: Finding[] = [];

    if (!fs.existsSync(absContractsDir)) {
      return { data, filesByKind, loadFindings };
    }

    const allFilesInDir = fs.readdirSync(absContractsDir);

    for (const kind of this.kinds.values()) {
      const matchedFiles: string[] = [];

      for (const pattern of kind.files) {
        // Simple glob/filename matching (e.g. 'requirements.contract.mjs' or '*.contract.mjs')
        const regexPattern = new RegExp(`^${pattern.replace(/\./g, '\\.').replace(/\*/g, '.*')}$`);

        for (const file of allFilesInDir) {
          if (regexPattern.test(file)) {
            matchedFiles.push(file);
          }
        }
      }

      const uniqueMatchedFiles = Array.from(new Set(matchedFiles));
      filesByKind.set(kind.id, uniqueMatchedFiles);

      if (uniqueMatchedFiles.length > 0) {
        // Load primary file or merged modules
        const primaryFile = uniqueMatchedFiles[0];
        if (primaryFile) {
          const absPath = path.join(absContractsDir, primaryFile);
          try {
            const fileUrl = `${pathToFileURL(absPath).href}?t=${Date.now()}`;
            const mod = await import(fileUrl);
            const parsed = kind.load(mod, primaryFile);
            data.set(kind.id, parsed);
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            loadFindings.push({
              ruleId: `${kind.id.toUpperCase()}-LOAD-ERROR`,
              severity: 'error',
              message: `Failed to load contract "${primaryFile}": ${msg}`,
              file: primaryFile,
            });
          }
        }
      }
    }

    return { data, filesByKind, loadFindings };
  }

  /**
   * Validate all invariant rules across all registered kinds
   */
  public async validate(contractsDir: string, cwd: string = process.cwd()): Promise<Finding[]> {
    const { data, loadFindings } = await this.loadAll(contractsDir, cwd);
    const findings: Finding[] = [...loadFindings];

    const ctx: RuleCtx = {
      get: <T = unknown>(kindId: string): T | undefined => data.get(kindId) as T | undefined,
      contractsDir,
    };

    for (const kind of this.kinds.values()) {
      const kindData = data.get(kind.id);
      if (!kindData) continue;

      for (const rule of kind.rules) {
        try {
          const ruleFindings = rule.check(kindData, ctx);
          if (Array.isArray(ruleFindings)) {
            findings.push(...ruleFindings);
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          findings.push({
            ruleId: rule.id,
            severity: 'error',
            message: `Unexpected exception in rule check "${rule.id}": ${msg}`,
          });
        }
      }
    }

    return findings;
  }

  /**
   * Emit generated code or documentation from kinds providing emit()
   */
  public async emit(
    target: 'ts' | 'docs',
    contractsDir: string,
    cwd: string = process.cwd(),
  ): Promise<GeneratedFile[]> {
    const { data } = await this.loadAll(contractsDir, cwd);
    const generated: GeneratedFile[] = [];

    const ctx: EmitCtx = {
      target,
      contractsDir,
      get: <T = unknown>(kindId: string): T | undefined => data.get(kindId) as T | undefined,
    };

    for (const kind of this.kinds.values()) {
      if (typeof kind.emit === 'function') {
        const kindData = data.get(kind.id);
        if (kindData) {
          const files = kind.emit(kindData, ctx);
          if (Array.isArray(files)) {
            generated.push(...files);
          }
        }
      }
    }

    return generated;
  }

  /**
   * Verify that every invariant rule in every registered kind has >= 1 selftest mutation
   */
  public verifyMutationCoverage(): { valid: boolean; missing: string[] } {
    const missing: string[] = [];

    for (const kind of this.kinds.values()) {
      const mutationRules = new Set(kind.mutations.map((m) => m.rule));

      for (const rule of kind.rules) {
        if (!mutationRules.has(rule.id)) {
          missing.push(`${kind.id}:${rule.id}`);
        }
      }
    }

    return {
      valid: missing.length === 0,
      missing,
    };
  }
}
