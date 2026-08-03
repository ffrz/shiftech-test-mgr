import { readdir } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { relative, resolve, sep } from 'node:path';
import type { CodegenTestCase } from './api.js';
import { AutomationApi } from './api.js';
import type { RunnerConfig } from './config.js';
import { log } from './logger.js';

const SCRIPT_PATTERN = /\.(?:spec|test)\.(?:[cm]?[jt]sx?)$/i;
const IGNORED_DIRECTORIES = new Set([
  '.git', 'node_modules', 'playwright-report', 'test-results', 'blob-report', 'artifacts',
]);

function toScriptRef(projectDir: string, absolutePath: string): string {
  return relative(projectDir, absolutePath).split(sep).join('/');
}

export async function discoverPlaywrightScripts(projectDir: string): Promise<string[]> {
  const root = resolve(projectDir);
  const scripts: string[] = [];

  async function visit(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        if (!IGNORED_DIRECTORIES.has(entry.name)) await visit(path);
      } else if (entry.isFile() && SCRIPT_PATTERN.test(entry.name)) {
        scripts.push(toScriptRef(root, path));
      }
    }
  }

  await visit(root);
  return scripts.sort((a, b) => a.localeCompare(b));
}

export function unmappedScripts(scripts: string[], testCases: Pick<CodegenTestCase, 'script_ref'>[]): string[] {
  const mapped = new Set(testCases.flatMap((testCase) => testCase.script_ref ? [testCase.script_ref.replaceAll('\\', '/')] : []));
  return scripts.filter((script) => !mapped.has(script));
}

async function selectTestCase(scriptRef: string, testCases: CodegenTestCase[]): Promise<CodegenTestCase | null> {
  process.stdout.write(`\nScript baru terdeteksi: ${scriptRef}\n`);
  testCases.forEach((item, index) => process.stdout.write(`${index + 1}. ${item.code} — ${item.title}\n`));
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await prompt.question('Petakan ke Test Case (kosong untuk lewati): ')).trim();
    if (!answer) return null;
    const index = Number(answer) - 1;
    if (!Number.isInteger(index) || !testCases[index]) throw new Error('Pilihan Test Case tidak valid');
    return testCases[index];
  } finally {
    prompt.close();
  }
}

export async function runScriptSync(config: RunnerConfig): Promise<number> {
  const api = new AutomationApi(config);
  const testCases = await api.listCodegenTestCases();
  const availableCases = testCases.filter((testCase) => !testCase.script_ref);
  const discovered = unmappedScripts(await discoverPlaywrightScripts(config.projectDir), testCases);

  if (discovered.length === 0) {
    log.info('Tidak ada script Playwright baru yang perlu dipetakan');
    return 0;
  }
  if (availableCases.length === 0) {
    log.info('Script baru terdeteksi, tetapi tidak ada Test Case aktif yang belum ter-automate', { count: discovered.length });
    return 0;
  }

  log.info('Script Playwright baru terdeteksi', { count: discovered.length });
  for (const scriptRef of discovered) {
    if (availableCases.length === 0) break;
    const selected = await selectTestCase(scriptRef, availableCases);
    if (!selected) continue;
    await api.attachCodegenScript(selected.id, scriptRef);
    availableCases.splice(availableCases.indexOf(selected), 1);
    log.info('Script dipetakan ke Test Case', { testCase: selected.code, scriptRef });
  }
  return 0;
}
