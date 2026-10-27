import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from '../config/loader.js';
import { ContractRegistry } from '../kinds/registry.js';
import type { ContractKind } from '../kinds/types.js';
import type { CodegenFileResult, CodegenOptions, CodegenResult } from './types.js';

export async function runCodegen(
  options: CodegenOptions & { kinds?: ContractKind[]; registry?: ContractRegistry } = {},
): Promise<CodegenResult> {
  const cwd = options.cwd ?? process.cwd();
  const { config } = await loadConfig(cwd);

  const contractsDir = options.contractsDir ?? config.contractsDir;
  const tsDir = options.generatedTsDir ?? config.generated.ts;
  const docsDir = options.generatedDocsDir ?? config.generated.docs;
  const isCheck = options.check ?? false;

  let registry = options.registry;
  if (!registry) {
    registry = new ContractRegistry();
    if (options.kinds && options.kinds.length > 0) {
      for (const k of options.kinds) {
        registry.register(k);
      }
    } else if (config.kinds && config.kinds.length > 0) {
      for (const k of config.kinds) {
        if (typeof (k as unknown as ContractKind).load === 'function') {
          registry.register(k as unknown as ContractKind);
        }
      }
    }
  }

  const results: CodegenFileResult[] = [];
  const errors: string[] = [];
  let hasDrift = false;

  // Emit TypeScript files
  const tsFiles = await registry.emit('ts', contractsDir, cwd);
  for (const file of tsFiles) {
    const fullPath = path.resolve(cwd, tsDir, file.path);
    if (isCheck) {
      if (!fs.existsSync(fullPath)) {
        hasDrift = true;
        results.push({ path: file.path, fullPath, target: 'ts', status: 'missing' });
      } else {
        const onDisk = fs.readFileSync(fullPath, 'utf8');
        if (onDisk !== file.content) {
          hasDrift = true;
          results.push({ path: file.path, fullPath, target: 'ts', status: 'drift' });
        } else {
          results.push({ path: file.path, fullPath, target: 'ts', status: 'unchanged' });
        }
      }
    } else {
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, file.content, 'utf8');
      results.push({ path: file.path, fullPath, target: 'ts', status: 'written' });
    }
  }

  // Emit Documentation files
  const docFiles = await registry.emit('docs', contractsDir, cwd);
  for (const file of docFiles) {
    const fullPath = path.resolve(cwd, docsDir, file.path);
    if (isCheck) {
      if (!fs.existsSync(fullPath)) {
        hasDrift = true;
        results.push({ path: file.path, fullPath, target: 'docs', status: 'missing' });
      } else {
        const onDisk = fs.readFileSync(fullPath, 'utf8');
        if (onDisk !== file.content) {
          hasDrift = true;
          results.push({ path: file.path, fullPath, target: 'docs', status: 'drift' });
        } else {
          results.push({ path: file.path, fullPath, target: 'docs', status: 'unchanged' });
        }
      }
    } else {
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, file.content, 'utf8');
      results.push({ path: file.path, fullPath, target: 'docs', status: 'written' });
    }
  }

  return {
    success: !hasDrift && errors.length === 0,
    drift: hasDrift,
    files: results,
    errors,
  };
}
