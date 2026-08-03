import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import type { CodegenTestCase } from './api.js';
import { AutomationApi } from './api.js';
import type { RunnerConfig } from './config.js';
import { log } from './logger.js';
import { assertTrustedRepository, childProcessEnvironment, parseAllowedPlaywrightCommand } from './security.js';

export function codegenScriptRef(testCase: Pick<CodegenTestCase, 'code'>): string {
  const slug = testCase.code.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `tests/${slug || 'recorded'}.spec.ts`;
}

export function createCodegenInvocation(config: Pick<RunnerConfig, 'playwrightCmd'>, url: string, output: string) {
  const invocation = parseAllowedPlaywrightCommand(config.playwrightCmd);
  const baseArgs = invocation.args.at(-1) === 'test' ? invocation.args.slice(0, -1) : invocation.args;
  return { command: invocation.command, args: [...baseArgs, 'codegen', url, '--output', output] };
}

export function formatCodegenChecklist(testCase: Pick<CodegenTestCase, 'code' | 'title' | 'steps'>): string {
  const lines = [`\nChecklist langkah manual ${testCase.code} — ${testCase.title}:`];
  if (testCase.steps.length === 0) {
    lines.push('(Test Case ini belum memiliki langkah manual terstruktur.)');
  } else {
    for (const step of testCase.steps) {
      lines.push(`[ ] ${step.step_number}. ${step.action}`);
      if (step.expected_result) lines.push(`    Hasil yang diharapkan: ${step.expected_result}`);
    }
  }
  lines.push('Gunakan checklist ini sebagai panduan selama Playwright Codegen terbuka.\n');
  return lines.join('\n');
}

function waitForExit(child: ChildProcess): Promise<number> {
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code, signal) => resolve(signal ? 1 : (code ?? 1)));
  });
}

async function selectTestCase(testCases: CodegenTestCase[]): Promise<CodegenTestCase | null> {
  if (testCases.length === 0) throw new Error('Tidak ada Test Case aktif pada proyek runner ini');
  process.stdout.write('\nPilih Test Case untuk script hasil rekaman:\n');
  testCases.forEach((item, index) => process.stdout.write(`${index + 1}. ${item.code} — ${item.title}${item.script_ref ? ` (saat ini: ${item.script_ref})` : ''}\n`));
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await prompt.question('Nomor Test Case (kosong untuk batal): ')).trim();
    if (!answer) return null;
    const index = Number(answer) - 1;
    if (!Number.isInteger(index) || !testCases[index]) throw new Error('Pilihan Test Case tidak valid');
    return testCases[index];
  } finally {
    prompt.close();
  }
}

export async function runCodegen(config: RunnerConfig, url: string): Promise<number> {
  assertTrustedRepository(config.projectDir, config.trustedRepositories);
  const api = new AutomationApi(config);
  const selected = await selectTestCase(await api.listCodegenTestCases());
  if (!selected) return 0;

  const scriptRef = selected.script_ref ?? codegenScriptRef(selected);
  if (isAbsolute(scriptRef)) throw new Error('script_ref harus relatif terhadap TM_PROJECT_DIR');
  const output = resolve(config.projectDir, scriptRef);
  const rel = relative(config.projectDir, output);
  if (!rel || rel === '..' || rel.startsWith(`..${sep}`)) throw new Error('script_ref berada di luar TM_PROJECT_DIR');
  mkdirSync(resolve(output, '..'), { recursive: true });

  process.stdout.write(formatCodegenChecklist(selected));
  const invocation = createCodegenInvocation(config, url, output);
  log.info('Starting Playwright codegen', { testCase: selected.code, scriptRef });
  const exitCode = await waitForExit(spawn(invocation.command, invocation.args, { cwd: config.projectDir, env: childProcessEnvironment(), stdio: 'inherit' }));
  if (exitCode !== 0) return exitCode;
  if (!existsSync(output)) throw new Error(`Playwright selesai tetapi script tidak ditemukan: ${scriptRef}`);
  await api.attachCodegenScript(selected.id, scriptRef);
  log.info('Script codegen attached to Test Case', { testCase: selected.code, scriptRef });
  return 0;
}
