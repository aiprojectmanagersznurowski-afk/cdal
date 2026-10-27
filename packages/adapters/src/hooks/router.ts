import fs from 'node:fs';
import path from 'node:path';
import { checkBash, checkWrite, getContractWindowStatus, resolveConfig } from '@cdal/core';
import { parseHookPayload } from './payload.js';
import type { HookExecutionOptions, HookExecutionResult, HookName } from './types.js';

export async function executeHook(
  hookName: HookName,
  rawPayload: string,
  options: HookExecutionOptions = {},
): Promise<HookExecutionResult> {
  const cwd = options.cwd ?? process.cwd();
  const config = options.config ?? resolveConfig({});
  const payload = parseHookPayload(
    rawPayload,
    options.runtime ?? 'claude-code',
    options.fallbackRole,
  );

  switch (hookName) {
    case 'guard-paths': {
      if (!payload.filePath) {
        return { blocked: false, exitCode: 0 };
      }
      const role = payload.role ?? 'unknown';
      const res = checkWrite(payload.filePath, '', {
        role,
        enforceContract: true,
        config,
        cwd,
      });

      if (res.blocked) {
        return {
          blocked: true,
          exitCode: 2,
          stderr: `[guard-paths / ${role}] BLOCKED write to: ${payload.filePath}\n${res.reason ?? 'Write prohibited by role scope or contract policy.'}\n`,
        };
      }
      return { blocked: false, exitCode: 0 };
    }

    case 'guard-forbidden': {
      if (!payload.filePath || !payload.content) {
        return { blocked: false, exitCode: 0 };
      }
      const res = checkWrite(payload.filePath, payload.content, {
        role: null,
        enforceContract: false,
        config,
        cwd,
      });

      if (res.blocked) {
        return {
          blocked: true,
          exitCode: 2,
          stderr: `[guard-forbidden] BLOCKED write to: ${payload.filePath}\n${res.reason ?? 'Forbidden code pattern detected.'}\n`,
        };
      }
      return { blocked: false, exitCode: 0 };
    }

    case 'guard-bash': {
      if (!payload.command) {
        return { blocked: false, exitCode: 0 };
      }
      const res = checkBash(payload.command, { config, cwd });
      if (res.blocked) {
        return {
          blocked: true,
          exitCode: 2,
          stderr: `[guard-bash] BLOCKED command: ${payload.command}\nReason: ${res.reason ?? 'Potentially destructive or unauthorized shell command.'}\n`,
        };
      }
      return { blocked: false, exitCode: 0 };
    }

    case 'session-context': {
      const out: string[] = [];
      const woPath = path.resolve(cwd, '.cdal/state/current-workorder.json');
      if (fs.existsSync(woPath)) {
        try {
          const wo = JSON.parse(fs.readFileSync(woPath, 'utf8'));
          out.push(
            `ACTIVE WORK ORDER: ${wo.ticket ?? 'UNTRACKED'} — ${wo.title ?? 'No title'} | phase: ${wo.phase ?? 'PLAN'} | iter: ${wo.iteration ?? 1}/${wo.maxIterations ?? 3}`,
          );
          if (Array.isArray(wo.requirements) && wo.requirements.length > 0) {
            out.push(`Requirements: ${wo.requirements.join(', ')}`);
          }
        } catch {
          // Ignore state parsing errors
        }
      } else {
        out.push('No active Work Order found. Start loop with cdal plan / current workorder.');
      }

      const windowStatus = getContractWindowStatus(cwd);
      if (windowStatus.open) {
        out.push(
          `NOTICE: Contract window is OPEN until ${windowStatus.expiresAt} (Ticket: ${windowStatus.ticket}).`,
        );
      }

      return {
        blocked: false,
        exitCode: 0,
        stdout: out.join('\n'),
      };
    }

    case 'log-subagent': {
      const logFile = path.resolve(cwd, '.cdal/state/run-log.jsonl');
      try {
        fs.mkdirSync(path.dirname(logFile), { recursive: true });
        const logEntry = {
          timestamp: new Date().toISOString(),
          event: payload.eventName || 'SubagentEvent',
          agent: payload.role,
          session: payload.sessionId,
        };
        fs.appendFileSync(logFile, `${JSON.stringify(logEntry)}\n`, 'utf8');
      } catch {
        // Logging should never block work
      }
      return { blocked: false, exitCode: 0 };
    }

    default:
      return { blocked: false, exitCode: 0 };
  }
}
