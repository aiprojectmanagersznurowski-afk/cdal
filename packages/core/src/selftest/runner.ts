import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resolveConfig } from '../config/validator.js';
import { checkWrite } from '../guard/guard.js';
import { ContractRegistry } from '../kinds/registry.js';
import type { ContractKind } from '../kinds/types.js';
import { runValidation } from '../validate/runner.js';
import { BUILTIN_CONTENT_PROBES } from './probes.js';
import type {
  ContentProbe,
  MutationTestResult,
  ProbeTestResult,
  SelftestOptions,
  SelftestReport,
} from './types.js';

export async function runSelftest(options: SelftestOptions = {}): Promise<SelftestReport> {
  const cwd = options.cwd ?? process.cwd();
  const config = options.config ?? resolveConfig({});
  const contractsDir = options.contractsDir ?? path.resolve(cwd, config.contractsDir);

  const failures: string[] = [];
  const mutationResults: MutationTestResult[] = [];
  const probeResults: ProbeTestResult[] = [];

  // Step 1: Create registry with configured kinds
  const registry = new ContractRegistry();
  for (const kind of config.kinds) {
    if (typeof (kind as unknown as { load?: unknown }).load === 'function') {
      registry.register(kind as unknown as ContractKind);
    }
  }

  // Step 2: Invariant Check — Rule without mutation is a fatal configuration error
  const coverageCheck = registry.verifyMutationCoverage();
  if (!coverageCheck.valid) {
    for (const missing of coverageCheck.missing) {
      const parts = missing.split(':');
      const kindId = parts[0] ?? 'unknown';
      const ruleId = parts.slice(1).join(':');
      failures.push(
        `[CRITICAL] Rule "${ruleId}" in kind "${kindId}" has no mutation probe. A rule that cannot be broken is a decoration.`,
      );
    }
  }

  // Step 3: Base Validation Check — contracts must be green prior to mutations
  let baseOk = true;
  if (fs.existsSync(contractsDir)) {
    try {
      const baseValidation = await runValidation({ cwd, contractsDir, config });
      if (!baseValidation.valid) {
        baseOk = false;
        failures.push(
          `Base contracts in "${contractsDir}" are currently failing validation. Fix base contracts before running mutation selftest.`,
        );
        for (const err of baseValidation.findings.filter((f) => f.severity === 'error')) {
          const raw = err as unknown as Record<string, unknown>;
          const rule = err.ruleId || raw.rule || 'UNKNOWN';
          const msg = err.message || raw.msg || '';
          failures.push(`  - Base failure [${rule}]: ${msg}`);
        }
      }
    } catch (err: unknown) {
      baseOk = false;
      const msg = err instanceof Error ? err.message : String(err);
      failures.push(`Failed to run base validation: ${msg}`);
    }
  }

  // Step 4: Run Mutation Probes
  let mutationsPassed = 0;
  let mutationsTotal = 0;

  if (baseOk && fs.existsSync(contractsDir)) {
    for (const kind of registry.getAll()) {
      for (const mutation of kind.mutations) {
        mutationsTotal++;
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cdal-mut-'));
        try {
          fs.cpSync(contractsDir, tempDir, { recursive: true });
          const targetFile = path.join(tempDir, mutation.file);

          if (!fs.existsSync(targetFile)) {
            const err = `Mutation file "${mutation.file}" does not exist in contracts directory`;
            failures.push(`[${kind.id}] ${mutation.rule}: ${err}`);
            mutationResults.push({
              kindId: kind.id,
              rule: mutation.rule,
              file: mutation.file,
              passed: false,
              error: err,
            });
            continue;
          }

          const originalContent = fs.readFileSync(targetFile, 'utf8');
          const findPattern = mutation.find;
          const hasMatch =
            typeof findPattern === 'string'
              ? originalContent.includes(findPattern)
              : findPattern.test(originalContent);

          if (!hasMatch) {
            const err = `Mutation anchor not found in "${mutation.file}". Mutation probe is stale.`;
            failures.push(`[${kind.id}] ${mutation.rule}: ${err}`);
            mutationResults.push({
              kindId: kind.id,
              rule: mutation.rule,
              file: mutation.file,
              passed: false,
              error: err,
            });
            continue;
          }

          const mutatedContent = originalContent.replace(mutation.find, mutation.replace);
          fs.writeFileSync(targetFile, mutatedContent, 'utf8');

          const mutValidation = await runValidation({
            cwd,
            contractsDir: tempDir,
            config,
          });

          const fired = mutValidation.findings.some((f) => {
            const raw = f as unknown as Record<string, unknown>;
            const rule = f.ruleId || raw.rule;
            return rule === mutation.rule && f.severity === 'error';
          });

          if (fired) {
            mutationsPassed++;
            mutationResults.push({
              kindId: kind.id,
              rule: mutation.rule,
              file: mutation.file,
              passed: true,
            });
          } else {
            const err = `Mutation did not trigger target rule "${mutation.rule}". Rule is dead or ineffective.`;
            failures.push(`[${kind.id}] ${mutation.rule}: ${err}`);
            mutationResults.push({
              kindId: kind.id,
              rule: mutation.rule,
              file: mutation.file,
              passed: false,
              error: err,
            });
          }
        } finally {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      }
    }
  }

  // Step 5: Run Content Probes (Forbidden Rules & Gate Evasion Probes)
  const allProbes: ContentProbe[] = [...BUILTIN_CONTENT_PROBES, ...(options.extraProbes ?? [])];

  const activeForbiddenRules = new Set(config.forbidden.map((r) => r.id));
  const applicableProbes = allProbes.filter((p) => activeForbiddenRules.has(p.rule));

  let probesPassed = 0;
  const probesTotal = applicableProbes.length;

  for (const probe of applicableProbes) {
    const res = checkWrite(probe.file, probe.content, {
      role: null,
      enforceContract: false,
      config,
    });

    const firedRule = res.blocked ? res.rule : undefined;
    const passed = probe.fires ? firedRule === probe.rule : firedRule !== probe.rule;

    if (passed) {
      probesPassed++;
      probeResults.push({
        rule: probe.rule,
        desc: probe.desc,
        passed: true,
        fires: probe.fires,
        firedRule,
        reason: res.reason,
      });
    } else if (probe.fires) {
      const err = `Probe "${probe.desc}" failed to fire rule "${probe.rule}" (fired: "${firedRule || 'nothing'}").`;
      failures.push(err);
      probeResults.push({
        rule: probe.rule,
        desc: probe.desc,
        passed: false,
        fires: probe.fires,
        firedRule,
        error: err,
      });
    } else {
      const err = `FALSE ALARM: Probe "${probe.desc}" triggered rule "${firedRule}" on legitimate code.`;
      failures.push(err);
      probeResults.push({
        rule: probe.rule,
        desc: probe.desc,
        passed: false,
        fires: probe.fires,
        firedRule,
        error: err,
      });
    }
  }

  const ok = failures.length === 0;

  return {
    schemaVersion: 'selftest.v1',
    timestamp: new Date().toISOString(),
    mutationsPassed,
    mutationsTotal,
    probesPassed,
    probesTotal,
    failures,
    ok,
    mutationResults,
    probeResults,
  };
}
