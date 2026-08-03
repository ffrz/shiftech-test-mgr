export interface RunnerVersionPolicy {
  server_version: string;
  minimum_supported_runner_version: string;
}

export type RunnerCompatibility = 'current' | 'outdated' | 'unsupported';

const SEMVER_PATTERN = /^(\d+)\.(\d+)\.(\d+)(?:[-+][0-9A-Za-z.-]+)?$/;

function parseVersion(version: string): readonly [number, number, number] {
  const match = SEMVER_PATTERN.exec(version);
  if (!match) throw new Error(`Server mengirim versi yang tidak valid: ${version}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function compareVersions(left: string, right: string): number {
  const leftParts = parseVersion(left);
  const rightParts = parseVersion(right);
  for (let index = 0; index < leftParts.length; index += 1) {
    const difference = leftParts[index]! - rightParts[index]!;
    if (difference !== 0) return difference;
  }
  return 0;
}

export function evaluateRunnerCompatibility(runnerVersion: string, policy: RunnerVersionPolicy): RunnerCompatibility {
  if (compareVersions(runnerVersion, policy.minimum_supported_runner_version) < 0) return 'unsupported';
  if (compareVersions(runnerVersion, policy.server_version) < 0) return 'outdated';
  return 'current';
}
