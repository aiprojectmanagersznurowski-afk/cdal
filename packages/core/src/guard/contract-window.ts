import fs from 'node:fs';
import path from 'node:path';

export interface ContractWindowStatus {
  open: boolean;
  ticket?: string;
  openedAt?: string;
  expiresAt?: string;
}

export function getContractWindowStatePath(cwd: string = process.cwd()): string {
  return path.resolve(cwd, '.cdal/state/contract-window.json');
}

export function isContractWindowOpen(cwd: string = process.cwd()): boolean {
  try {
    const f = getContractWindowStatePath(cwd);
    if (!fs.existsSync(f)) return false;
    const data = JSON.parse(fs.readFileSync(f, 'utf8')) as ContractWindowStatus;
    if (!data.open) return false;
    if (data.expiresAt && Date.parse(data.expiresAt) <= Date.now()) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function openContractWindow(
  ticket: string,
  options: { durationMinutes?: number; cwd?: string } = {},
): ContractWindowStatus {
  const cwd = options.cwd ?? process.cwd();
  const duration = options.durationMinutes ?? 60;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + duration * 60 * 1000).toISOString();

  const status: ContractWindowStatus = {
    open: true,
    ticket: ticket.trim() || 'UNTRACKED_WINDOW',
    openedAt: now.toISOString(),
    expiresAt,
  };

  const f = getContractWindowStatePath(cwd);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(status, null, 2), 'utf8');

  return status;
}

export function closeContractWindow(cwd: string = process.cwd()): ContractWindowStatus {
  const status: ContractWindowStatus = {
    open: false,
  };

  const f = getContractWindowStatePath(cwd);
  if (fs.existsSync(f)) {
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, JSON.stringify(status, null, 2), 'utf8');
  }

  return status;
}

export function getContractWindowStatus(cwd: string = process.cwd()): ContractWindowStatus {
  try {
    const f = getContractWindowStatePath(cwd);
    if (!fs.existsSync(f)) {
      return { open: false };
    }
    const data = JSON.parse(fs.readFileSync(f, 'utf8')) as ContractWindowStatus;
    if (data.open && data.expiresAt && Date.parse(data.expiresAt) <= Date.now()) {
      return { ...data, open: false };
    }
    return data;
  } catch {
    return { open: false };
  }
}
