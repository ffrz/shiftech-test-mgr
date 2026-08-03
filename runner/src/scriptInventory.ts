import { readdir } from 'node:fs/promises';
import { extname, relative, resolve } from 'node:path';

const TEST_FILE_PATTERN = /(?:\.spec|\.test)\.(?:[cm]?[jt]sx?)$/i;
const MAX_SCRIPT_REFS = 5_000;

export async function discoverScriptRefs(projectDir: string): Promise<string[]> {
  const root = resolve(projectDir);
  const refs: string[] = [];

  async function walk(directory: string): Promise<void> {
    if (refs.length >= MAX_SCRIPT_REFS) return;
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (refs.length >= MAX_SCRIPT_REFS) break;
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile() && extname(entry.name) && TEST_FILE_PATTERN.test(entry.name)) {
        refs.push(relative(root, path).replaceAll('\\', '/'));
      }
    }
  }

  try { await walk(root); }
  catch { return []; }
  return refs.sort();
}
