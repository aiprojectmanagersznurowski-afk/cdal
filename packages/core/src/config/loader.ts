import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { CdalConfig, ResolvedCdalConfig } from './types.js';
import { CdalConfigError, resolveConfig } from './validator.js';

const CONFIG_CANDIDATES = ['cdal.config.mjs', 'cdal.config.js'];

export async function loadConfig(
  customPathOrCwd?: string,
): Promise<{ config: ResolvedCdalConfig; filepath: string | null }> {
  let cwd = process.cwd();
  let explicitFilePath: string | null = null;

  if (customPathOrCwd) {
    const resolved = path.resolve(cwd, customPathOrCwd);
    if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
      explicitFilePath = resolved;
      cwd = path.dirname(resolved);
    } else if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
      cwd = resolved;
    } else if (customPathOrCwd.endsWith('.mjs') || customPathOrCwd.endsWith('.js')) {
      throw new CdalConfigError(
        `Specified configuration file does not exist: "${customPathOrCwd}"`,
        [`File not found: ${resolved}`],
      );
    }
  }

  let finalConfigPath: string | null = explicitFilePath;

  if (!finalConfigPath) {
    for (const candidate of CONFIG_CANDIDATES) {
      const p = path.join(cwd, candidate);
      if (fs.existsSync(p)) {
        finalConfigPath = p;
        break;
      }
    }
  }

  if (!finalConfigPath) {
    // Return resolved default configuration if no config file is present in project
    return {
      config: resolveConfig({}),
      filepath: null,
    };
  }

  try {
    const fileUrl = pathToFileURL(finalConfigPath).href;
    const mod = await import(fileUrl);
    const rawConfig = (mod.default ?? mod.config ?? mod) as CdalConfig;

    const resolved = resolveConfig(rawConfig);
    return {
      config: resolved,
      filepath: finalConfigPath,
    };
  } catch (err: unknown) {
    if (err instanceof CdalConfigError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : String(err);
    throw new CdalConfigError(
      `Failed to load CDAL configuration from "${finalConfigPath}": ${message}`,
      [message],
    );
  }
}
