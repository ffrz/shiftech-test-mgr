import { execFile } from 'node:child_process';
import { existsSync, realpathSync } from 'node:fs';
import { isAbsolute, normalize, relative, resolve } from 'node:path';
import { promisify } from 'node:util';
import { GitCloneRepo, LocalPathRepo } from '@testmanager/agent-core';
import type { JobRepository } from './api.js';
import type { RunnerConfig } from './config.js';
import { inspectLocalRepository, type LocalRepositoryMetadata } from './localRepository.js';
import { assertTrustedRepository, registerSecret } from './security.js';

const execFileAsync = promisify(execFile);

type GitCommand = (args: readonly string[], env: NodeJS.ProcessEnv) => Promise<void>;
type InspectRepository = (repositoryPath: string) => LocalRepositoryMetadata;

async function runGit(args: readonly string[], env: NodeJS.ProcessEnv): Promise<void> {
  await execFileAsync('git', [...args], { env, maxBuffer: 1024 * 1024 });
}

function resolveSubdirectory(repositoryRoot: string, subdirectory: string | null): string {
  if (!subdirectory) return repositoryRoot;
  if (isAbsolute(subdirectory)) throw new Error('Repository subdirectory harus berupa path relatif');
  const resolved = resolve(repositoryRoot, normalize(subdirectory));
  const lexicalChildPath = relative(repositoryRoot, resolved);
  if (!lexicalChildPath || lexicalChildPath.startsWith('..') || isAbsolute(lexicalChildPath)) {
    throw new Error('Repository subdirectory berada di luar root repository');
  }
  if (!existsSync(resolved)) throw new Error(`Repository subdirectory tidak ditemukan: ${subdirectory}`);
  const realRoot = realpathSync(repositoryRoot);
  const realResolved = realpathSync(resolved);
  const childPath = relative(realRoot, realResolved);
  if (!childPath || childPath.startsWith('..') || isAbsolute(childPath)) {
    throw new Error('Repository subdirectory berada di luar root repository');
  }
  return realResolved;
}

export async function prepareJobRepository(
  config: RunnerConfig,
  repository: JobRepository | null,
  gitCommand: GitCommand = runGit,
  inspectRepository: InspectRepository = inspectLocalRepository,
): Promise<{ projectDir: string; metadata: LocalRepositoryMetadata }> {
  const adapterGit = async (path: string, args: readonly string[]): Promise<string> => {
    const inspected = inspectRepository(path);
    if (args[0] === 'rev-parse' && args[1] === '--show-toplevel') return inspected.path;
    if (args[0] === 'rev-parse' && args[1] === 'HEAD') return inspected.commitSha;
    return '';
  };
  if (!repository) {
    const workspace = await new LocalPathRepo({ git: adapterGit }).prepare({ source: config.projectDir });
    const metadata = inspectRepository(workspace.rootPath);
    assertTrustedRepository(metadata.path, config.trustedRepositories);
    return { projectDir: config.projectDir, metadata };
  }

  if (repository.source_type === 'local_path') {
    const workspace = await new LocalPathRepo({ git: adapterGit }).prepare({ source: repository.url_or_path });
    const metadata = inspectRepository(workspace.rootPath);
    assertTrustedRepository(metadata.path, config.trustedRepositories);
    return {
      projectDir: resolveSubdirectory(repository.url_or_path, repository.subdirectory),
      metadata,
    };
  }

  if (repository.source_type === 'github_private' && !repository.token) {
    throw new Error('Credential private repository tidak tersedia');
  }

  registerSecret(repository.token);
  const workspace = await new GitCloneRepo({
    cacheDir: config.repositoryCacheDir,
    credentialResolver: async () => repository.token,
    command: gitCommand,
    git: adapterGit,
  }).prepare({ source: repository.url_or_path, revision: repository.default_branch || 'main', credentialsRef: repository.id });
  const metadata = inspectRepository(workspace.rootPath);
  assertTrustedRepository(metadata.path, config.trustedRepositories);
  return {
    projectDir: resolveSubdirectory(workspace.rootPath, repository.subdirectory),
    metadata,
  };
}
