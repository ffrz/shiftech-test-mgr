import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { statfs } from 'node:fs/promises';

export interface RunnerDiagnosticResult {
  baseUrlReachable: boolean;
  browserInstalled: boolean;
  playwrightVersion: string | null;
  diskFreeBytes: number;
  errorMessage: string | null;
}

export async function runDiagnostics(baseUrl: string | null, projectDir: string): Promise<RunnerDiagnosticResult> {
  let baseUrlReachable = false;
  let playwrightVersion: string | null = null;
  let browserInstalled = false;
  const errors: string[] = [];
  if (baseUrl) {
    try {
      const response = await fetch(baseUrl, { method: 'HEAD', signal: AbortSignal.timeout(10_000), redirect: 'follow' });
      baseUrlReachable = response.status < 500;
      if (!baseUrlReachable) errors.push(`Base URL merespons HTTP ${response.status}`);
    } catch (error) { errors.push(`Base URL tidak terjangkau: ${(error as Error).message}`); }
  } else errors.push('Environment project belum memiliki Base URL');
  try {
    playwrightVersion = execFileSync('npx', ['playwright', '--version'], { cwd: projectDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 15_000 }).trim().replace(/^Version\s+/i, '');
    const output = execFileSync('npx', ['playwright', 'install', '--dry-run'], { cwd: projectDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 20_000 });
    const installLocations = [...output.matchAll(/Install location:\s*(.+)$/gim)].map((match) => match[1]?.trim()).filter((path): path is string => Boolean(path));
    browserInstalled = installLocations.length > 0 && installLocations.some(existsSync);
    if (!browserInstalled) errors.push('Browser Playwright belum terpasang');
  } catch { errors.push('Playwright tidak ditemukan di workspace runner'); }
  const disk = await statfs(projectDir);
  const diskFreeBytes = Number(disk.bavail) * Number(disk.bsize);
  if (diskFreeBytes <= 1024 ** 3) errors.push('Ruang disk tersisa kurang dari 1 GB');
  return { baseUrlReachable, browserInstalled, playwrightVersion, diskFreeBytes, errorMessage: errors.length ? errors.join('. ') : null };
}
