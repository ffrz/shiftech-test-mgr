import { execFileSync } from 'node:child_process';
import { platform, release } from 'node:os';
import type { AutomationJob, EnvironmentMetadata } from './api.js';
import type { ExecutionTarget } from './executor.js';
import type { LocalRepositoryMetadata } from './localRepository.js';

const DEFAULT_VIEWPORT = { width: 1280, height: 720 };

type VersionCommand = (projectDir: string, browser: ExecutionTarget['browser']) => string;

function readBrowserVersion(projectDir: string, browser: ExecutionTarget['browser']): string {
  try {
    const output = execFileSync('npx', ['playwright', 'install', '--dry-run'], {
      cwd: projectDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const label = browser === 'chromium' ? 'Chrome for Testing' : browser === 'firefox' ? 'Firefox' : 'WebKit';
    const match = output.match(new RegExp(`^${label.replace(/ /g, '\\s+')}\\s+(\\S+)`, 'mi'));
    return match?.[1] ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

function parseViewport(value: string | undefined): EnvironmentMetadata['viewport'] {
  const match = value?.trim().match(/^(\d{2,5})x(\d{2,5})$/i);
  if (!match) return DEFAULT_VIEWPORT;
  return { width: Number(match[1]), height: Number(match[2]) };
}

export function collectEnvironmentMetadata(
  job: AutomationJob,
  target: ExecutionTarget,
  repository: LocalRepositoryMetadata | undefined,
  projectDir: string,
  versionCommand: VersionCommand = readBrowserVersion,
): EnvironmentMetadata {
  return {
    browser: target.browser,
    browserVersion: versionCommand(projectDir, target.browser),
    os: `${platform()} ${release()}`,
    viewport: parseViewport(process.env.TM_PLAYWRIGHT_VIEWPORT),
    baseUrl: job.base_url ?? null,
    buildVersion: job.build_version ?? null,
    commitSha: repository?.commitSha ?? null,
  };
}
