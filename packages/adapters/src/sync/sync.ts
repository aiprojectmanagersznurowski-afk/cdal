import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { ResolvedCdalConfig } from '@cdal/core';
import { generateAgentsMdFiles } from '../agents-md/agents-md.js';
import { generateAntigravityFiles } from '../antigravity/antigravity.js';
import { generateClaudeFiles } from '../claude/claude.js';

export interface SyncOptions {
  cwd?: string;
  config: ResolvedCdalConfig;
  check?: boolean;
}

export interface SyncResult {
  inSync: boolean;
  driftedFiles: string[];
  updatedFiles: string[];
  totalFiles: number;
}

export function syncAdapters(options: SyncOptions): SyncResult {
  const cwd = options.cwd ?? process.cwd();
  const config = options.config;
  const isCheck = Boolean(options.check);

  const filesToSync: Array<{ path: string; content: string }> = [];

  const runtimes = config.runtimes.length > 0 ? config.runtimes : ['claude-code', 'agents-md'];

  if (runtimes.includes('claude-code')) {
    const claudeMdPath = resolve(cwd, 'CLAUDE.md');
    const existingClaudeMd = existsSync(claudeMdPath) ? readFileSync(claudeMdPath, 'utf8') : '';
    filesToSync.push(...generateClaudeFiles(config, existingClaudeMd));
  }

  if (runtimes.includes('agents-md')) {
    const agentsMdPath = resolve(cwd, 'AGENTS.md');
    const existingAgentsMd = existsSync(agentsMdPath) ? readFileSync(agentsMdPath, 'utf8') : '';
    filesToSync.push(...generateAgentsMdFiles(config, existingAgentsMd));
  }

  if (runtimes.includes('antigravity')) {
    filesToSync.push(...generateAntigravityFiles(config));
  }

  const driftedFiles: string[] = [];
  const updatedFiles: string[] = [];

  for (const file of filesToSync) {
    const absPath = resolve(cwd, file.path);
    const exists = existsSync(absPath);
    const currentContent = exists ? readFileSync(absPath, 'utf8') : null;

    if (currentContent !== file.content) {
      if (isCheck) {
        driftedFiles.push(file.path);
      } else {
        mkdirSync(dirname(absPath), { recursive: true });
        writeFileSync(absPath, file.content, 'utf8');
        updatedFiles.push(file.path);
      }
    }
  }

  return {
    inSync: isCheck ? driftedFiles.length === 0 : true,
    driftedFiles,
    updatedFiles,
    totalFiles: filesToSync.length,
  };
}
