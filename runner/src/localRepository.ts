import { execFileSync } from 'node:child_process';
import { accessSync, constants, existsSync, statSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';

export interface LocalRepositoryMetadata {
  path: string;
  branch: string | null;
  commitSha: string;
  dirty: boolean;
}

type GitCommand = (repositoryPath: string, args: string[]) => string;

function runGit(repositoryPath: string, args: string[]): string {
  try {
    return execFileSync('git', ['-C', repositoryPath, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Tidak dapat membaca metadata git di ${repositoryPath}: ${message}`);
  }
}

/**
 * Validate a local_path repository and return metadata safe to send centrally.
 * No repository file is read or returned; only Git's own metadata is queried.
 */
export function inspectLocalRepository(
  repositoryPath: string,
  gitCommand: GitCommand = runGit,
): LocalRepositoryMetadata {
  if (!isAbsolute(repositoryPath)) {
    throw new Error(`TM_PROJECT_DIR harus berupa path absolut: ${repositoryPath}`);
  }
  if (!existsSync(repositoryPath)) {
    throw new Error(`Local path tidak ditemukan: ${repositoryPath}`);
  }

  let directory = false;
  try {
    directory = statSync(repositoryPath).isDirectory();
    accessSync(repositoryPath, constants.R_OK);
  } catch {
    throw new Error(`Local path tidak terbaca: ${repositoryPath}`);
  }
  if (!directory) {
    throw new Error(`Local path bukan direktori: ${repositoryPath}`);
  }
  if (!existsSync(join(repositoryPath, '.git'))) {
    throw new Error(`Local path bukan git repository (.git tidak ditemukan): ${repositoryPath}`);
  }

  // git rev-parse --show-toplevel always prints forward slashes, even on Windows,
  // while repositoryPath comes from fs.realpath and uses the platform separator
  // (backslashes on Windows) — normalize before comparing so this isn't a
  // guaranteed mismatch on every Windows machine.
  const repositoryRoot = gitCommand(repositoryPath, ['rev-parse', '--show-toplevel']);
  const normalize = (p: string) => p.replace(/\\/g, '/').replace(/\/$/, '');
  if (normalize(repositoryRoot) !== normalize(repositoryPath)) {
    throw new Error(`Local path harus menunjuk root git repository: ${repositoryPath}`);
  }

  const commitSha = gitCommand(repositoryPath, ['rev-parse', 'HEAD']);
  const branchOutput = gitCommand(repositoryPath, ['branch', '--show-current']);
  const status = gitCommand(repositoryPath, ['status', '--porcelain']);

  return {
    path: repositoryPath,
    branch: branchOutput || null,
    commitSha,
    dirty: status.length > 0,
  };
}
