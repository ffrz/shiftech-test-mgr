import { chmodSync, mkdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';

interface TrustStoreDocument {
  version: 1;
  repositories: string[];
}

export function defaultTrustStorePath(env: NodeJS.ProcessEnv = process.env): string {
  if (env.TM_TRUST_STORE_PATH?.trim()) return resolve(env.TM_TRUST_STORE_PATH.trim());
  const configRoot = env.XDG_CONFIG_HOME?.trim() || resolve(homedir(), '.config');
  return resolve(configRoot, 'testmanager', 'trusted-repositories.json');
}

export function loadTrustedRepositories(path = defaultTrustStorePath()): string[] {
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as Partial<TrustStoreDocument>;
    if (parsed.version !== 1 || !Array.isArray(parsed.repositories) || parsed.repositories.some((item) => typeof item !== 'string')) {
      throw new Error('format tidak valid');
    }
    return [...new Set(parsed.repositories.map((item) => realpathSync(item)))];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw new Error(`Trust store runner tidak dapat dibaca: ${path}`, { cause: error });
  }
}

export function trustRepository(repositoryPath: string, storePath = defaultTrustStorePath()): string {
  const canonicalPath = realpathSync(resolve(repositoryPath));
  const repositories = loadTrustedRepositories(storePath);
  if (!repositories.includes(canonicalPath)) repositories.push(canonicalPath);

  const directory = dirname(storePath);
  const temporaryPath = `${storePath}.${process.pid}.tmp`;
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  try {
    writeFileSync(temporaryPath, `${JSON.stringify({ version: 1, repositories }, null, 2)}\n`, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
    chmodSync(temporaryPath, 0o600);
    renameSync(temporaryPath, storePath);
    chmodSync(storePath, 0o600);
  } catch (error) {
    rmSync(temporaryPath, { force: true });
    throw error;
  }
  return canonicalPath;
}
