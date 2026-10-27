export interface CodegenOptions {
  contractsDir?: string;
  generatedTsDir?: string;
  generatedDocsDir?: string;
  check?: boolean;
  cwd?: string;
}

export type CodegenFileStatus = 'written' | 'unchanged' | 'drift' | 'missing';

export interface CodegenFileResult {
  path: string;
  fullPath: string;
  target: 'ts' | 'docs';
  status: CodegenFileStatus;
}

export interface CodegenResult {
  success: boolean;
  drift: boolean;
  files: CodegenFileResult[];
  errors: string[];
}
