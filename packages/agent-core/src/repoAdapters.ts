import { execFile } from 'node:child_process';
import { access, mkdir, readFile, realpath, readdir, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { promisify } from 'node:util';

import type { BinaryContent, RepoAdapter, RepositoryEntry, RepositoryReference, RepositoryWorkspace } from './index.js';

const execFileAsync = promisify(execFile);

export class RepoAdapterError extends Error {
  constructor(message = 'Repository access failed') {
    super(message);
    this.name = 'RepoAdapterError';
  }
}

export interface LocalPathRepoOptions {
  git?: (repositoryPath: string, args: readonly string[]) => Promise<string>;
}

export interface GitCloneRepoOptions extends LocalPathRepoOptions {
  cacheDir: string;
  credentialResolver?: (credentialsRef: string) => Promise<string | null>;
  command?: (args: readonly string[], env: NodeJS.ProcessEnv) => Promise<void>;
}

const defaultGit = async (repositoryPath: string, args: readonly string[]): Promise<string> => {
  const result = await execFileAsync('git', ['-C', repositoryPath, ...args], {
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }, maxBuffer: 4 * 1024 * 1024,
  });
  return result.stdout.trim();
};

const containedPath = async (root: string, requested = '', mustExist = true): Promise<string> => {
  if (isAbsolute(requested) || requested.includes('\0')) throw new RepoAdapterError('Repository path must be relative');
  const target = resolve(root, requested || '.');
  const child = relative(root, target);
  if (child.startsWith('..') || isAbsolute(child)) throw new RepoAdapterError('Repository path escapes workspace');
  if (!mustExist) return target;
  const canonical = await realpath(target).catch(() => { throw new RepoAdapterError('Repository path was not found'); });
  const canonicalChild = relative(root, canonical);
  if (canonicalChild.startsWith('..') || isAbsolute(canonicalChild)) throw new RepoAdapterError('Repository path escapes workspace');
  return canonical;
};

abstract class BaseRepo implements RepoAdapter {
  protected readonly git: (repositoryPath: string, args: readonly string[]) => Promise<string>;
  constructor(options: LocalPathRepoOptions = {}) { this.git = options.git ?? defaultGit; }

  abstract prepare(reference: RepositoryReference): Promise<RepositoryWorkspace>;

  async list(workspace: RepositoryWorkspace, path = ''): Promise<readonly RepositoryEntry[]> {
    const target = await containedPath(workspace.rootPath, path);
    const entries = await readdir(target, { withFileTypes: true });
    return Promise.all(entries.map(async entry => ({
      path: relative(workspace.rootPath, join(target, entry.name)).replaceAll('\\', '/'),
      kind: entry.isDirectory() ? 'directory' as const : 'file' as const,
      ...(entry.isFile() ? { size: (await stat(join(target, entry.name))).size } : {}),
    })));
  }

  async read(workspace: RepositoryWorkspace, path: string): Promise<BinaryContent> {
    const target = await containedPath(workspace.rootPath, path);
    if (!(await stat(target)).isFile()) throw new RepoAdapterError('Repository path is not a file');
    return readFile(target);
  }

  async release(_workspace: RepositoryWorkspace): Promise<void> { /* persistent local/cache workspace */ }

  protected async workspace(rootPath: string): Promise<RepositoryWorkspace> {
    const revision = await this.git(rootPath, ['rev-parse', 'HEAD']).catch(() => { throw new RepoAdapterError('Path is not a readable Git repository'); });
    return { rootPath, revision };
  }
}

export class LocalPathRepo extends BaseRepo {
  async prepare(reference: RepositoryReference): Promise<RepositoryWorkspace> {
    if (!isAbsolute(reference.source)) throw new RepoAdapterError('Local repository path must be absolute');
    const rootPath = await realpath(reference.source).catch(() => { throw new RepoAdapterError('Local repository path was not found'); });
    const info = await stat(rootPath).catch(() => { throw new RepoAdapterError('Local repository path is not readable'); });
    if (!info.isDirectory()) throw new RepoAdapterError('Local repository path is not a directory');
    await access(rootPath, constants.R_OK).catch(() => { throw new RepoAdapterError('Local repository path is not readable'); });
    const topLevel = await this.git(rootPath, ['rev-parse', '--show-toplevel']).catch(() => { throw new RepoAdapterError('Path is not a readable Git repository'); });
    if (await realpath(topLevel) !== rootPath) throw new RepoAdapterError('Local path must point to the Git repository root');
    return this.workspace(rootPath);
  }
}

export class GitCloneRepo extends BaseRepo {
  private readonly cacheDir: string;
  private readonly credentialResolver: ((credentialsRef: string) => Promise<string | null>) | undefined;
  private readonly command: (args: readonly string[], env: NodeJS.ProcessEnv) => Promise<void>;

  constructor(options: GitCloneRepoOptions) {
    super(options);
    this.cacheDir = options.cacheDir;
    this.credentialResolver = options.credentialResolver;
    this.command = options.command ?? (async (args, env) => { await execFileAsync('git', [...args], { env, maxBuffer: 1024 * 1024 }); });
  }

  async prepare(reference: RepositoryReference): Promise<RepositoryWorkspace> {
    const url = this.safeUrl(reference.source);
    const revision = reference.revision || 'main';
    const cacheKey = reference.credentialsRef || Buffer.from(url).toString('base64url').slice(0, 48);
    if (!/^[A-Za-z0-9._-]+$/.test(cacheKey)) throw new RepoAdapterError('Invalid repository cache key');
    const rootPath = join(this.cacheDir, cacheKey);
    await mkdir(this.cacheDir, { recursive: true });
    const token = reference.credentialsRef && this.credentialResolver ? await this.credentialResolver(reference.credentialsRef) : null;
    const env = this.gitEnvironment(token);
    try {
      const isRepo = await stat(join(rootPath, '.git')).then(value => value.isDirectory()).catch(() => false);
      if (!isRepo) {
        await this.command(['clone', '--no-tags', '--single-branch', '--branch', revision, '--', url, rootPath], env);
      } else {
        await this.command(['-C', rootPath, 'remote', 'set-url', 'origin', url], env);
        await this.command(['-C', rootPath, 'fetch', '--quiet', 'origin', revision], env);
        await this.command(['-C', rootPath, 'checkout', '--quiet', revision], env);
        await this.command(['-C', rootPath, 'reset', '--quiet', '--hard', `origin/${revision}`], env);
      }
      return await this.workspace(await realpath(rootPath));
    } catch (error) {
      if (error instanceof RepoAdapterError) throw error;
      throw new RepoAdapterError();
    }
  }

  private safeUrl(raw: string): string {
    try {
      const url = new URL(raw);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error();
      return url.toString();
    } catch { throw new RepoAdapterError('Repository URL must be credential-free HTTP(S)'); }
  }

  private gitEnvironment(token: string | null): NodeJS.ProcessEnv {
    if (!token) return { ...process.env, GIT_TERMINAL_PROMPT: '0' };
    const authorization = Buffer.from(`x-access-token:${token}`, 'utf8').toString('base64');
    return { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'http.extraHeader', GIT_CONFIG_VALUE_0: `Authorization: Basic ${authorization}` };
  }
}
