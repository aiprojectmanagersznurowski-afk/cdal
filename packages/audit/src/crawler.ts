import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';

export interface ScannedFile {
  relativePath: string;
  absolutePath: string;
  extension: string;
  sizeBytes: number;
  linesOfCode: number;
}

export interface WorkspaceFiles {
  cwd: string;
  allFiles: ScannedFile[];
  sourceFiles: ScannedFile[];
  testFiles: ScannedFile[];
  ciFiles: ScannedFile[];
  totalLOC: number;
}

const DEFAULT_IGNORED_DIRS = new Set([
  'node_modules',
  'dist',
  '.next',
  '.turbo',
  '.git',
  '.cache',
  'coverage',
  'build',
  '.vercel',
  '.output',
  'out',
]);

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

export function parseGitignore(cwd: string): (relPath: string) => boolean {
  const gitignorePath = join(cwd, '.gitignore');
  if (!existsSync(gitignorePath)) {
    return () => false;
  }

  try {
    const content = readFileSync(gitignorePath, 'utf8');
    const lines = content
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('#'));

    const patterns = lines.map((line) => {
      let pat = line.replace(/^\//, '');
      const isDir = pat.endsWith('/');
      if (isDir) {
        pat = pat.slice(0, -1);
      }
      return { raw: line, pattern: pat, isDir };
    });

    return (relPath: string) => {
      const normalized = relPath.replace(/\\/g, '/');
      const segments = normalized.split('/');

      for (const { pattern, isDir } of patterns) {
        if (pattern.startsWith('*.')) {
          const ext = pattern.slice(1);
          if (normalized.endsWith(ext)) return true;
        }
        if (segments.includes(pattern)) return true;
        if (normalized === pattern || normalized.startsWith(`${pattern}/`)) return true;
      }
      return false;
    };
  } catch {
    return () => false;
  }
}

export function crawlWorkspace(cwd: string): WorkspaceFiles {
  const resolvedCwd = resolve(cwd);
  const isIgnoredByGit = parseGitignore(resolvedCwd);

  const allFiles: ScannedFile[] = [];
  const sourceFiles: ScannedFile[] = [];
  const testFiles: ScannedFile[] = [];
  const ciFiles: ScannedFile[] = [];
  let totalLOC = 0;

  function walk(currentDir: string) {
    let entries: string[] = [];
    try {
      entries = readdirSync(currentDir);
    } catch {
      return;
    }

    for (const entry of entries) {
      if (DEFAULT_IGNORED_DIRS.has(entry)) {
        continue;
      }

      const fullPath = join(currentDir, entry);
      const relPath = relative(resolvedCwd, fullPath).replace(/\\/g, '/');

      if (isIgnoredByGit(relPath)) {
        continue;
      }

      let stat: ReturnType<typeof statSync>;
      try {
        stat = statSync(fullPath);
      } catch {
        continue;
      }

      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (stat.isFile()) {
        // Skip huge files (> 2 MB) or binary files
        if (stat.size > 2 * 1024 * 1024) {
          continue;
        }

        const extMatch = entry.match(/\.[A-Za-z0-9_-]+$/);
        const extension = extMatch ? extMatch[0].toLowerCase() : '';

        // Calculate line count only for text/source files
        let loc = 0;
        const isSource = SOURCE_EXTENSIONS.has(extension);
        const isCi = relPath.startsWith('.github/workflows/') || relPath.endsWith('.gitlab-ci.yml');
        const isTest =
          relPath.includes('.test.') ||
          relPath.includes('.spec.') ||
          relPath.includes('/test/') ||
          relPath.includes('/tests/') ||
          relPath.startsWith('test/') ||
          relPath.startsWith('tests/');

        if (
          isSource ||
          isCi ||
          extension === '.md' ||
          extension === '.json' ||
          extension === '.yml' ||
          extension === '.yaml'
        ) {
          try {
            const content = readFileSync(fullPath, 'utf8');
            loc = content.split('\n').length;
          } catch {
            loc = 0;
          }
        }

        const scanned: ScannedFile = {
          relativePath: relPath,
          absolutePath: fullPath,
          extension,
          sizeBytes: stat.size,
          linesOfCode: loc,
        };

        allFiles.push(scanned);

        if (isSource) {
          sourceFiles.push(scanned);
          totalLOC += loc;
        }
        if (isTest) {
          testFiles.push(scanned);
        }
        if (isCi) {
          ciFiles.push(scanned);
        }
      }
    }
  }

  walk(resolvedCwd);

  return {
    cwd: resolvedCwd,
    allFiles,
    sourceFiles,
    testFiles,
    ciFiles,
    totalLOC,
  };
}
