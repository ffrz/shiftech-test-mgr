import type { TestCasePriority, TestCaseStepType } from '../types/domain';

// Test case import — no external dependency, CSV instead of Excel to avoid the xlsx npm
// package's open, unpatched vulnerabilities. Excel/Google Sheets both export/import CSV
// natively, so "import from Excel" in the UI still works end-to-end for users — they just
// save as CSV first.
//
// Step Type detection: the Steps column doubles as the detailed-step carrier. If it contains
// "|" (action | expected result, steps separated by ";"), the row imports as step_type
// 'detailed' and each "action | expected" pair becomes one test_case_steps row. Otherwise the
// whole cell is stored as free text on TestCase.steps (step_type 'simple') — this keeps the
// old CSV format working unchanged.

export interface ParsedTestCaseStep {
  action: string;
  expectedResult: string | null;
}

export interface ParsedTestCaseRow {
  rowNumber: number;
  moduleName: string | null;
  title: string;
  objective: string | null;
  preconditions: string | null;
  steps: string;
  stepType: TestCaseStepType;
  detailedSteps: ParsedTestCaseStep[];
  expectedResult: string;
  priority: TestCasePriority;
  tagNames: string[];
  targetRole: string | null;
}

export interface InvalidRow {
  rowNumber: number;
  reason: string;
}

const EXPECTED_HEADERS = ['module', 'title', 'objective', 'preconditions', 'steps', 'expected result', 'priority', 'tags', 'target role'];
const PRIORITIES: TestCasePriority[] = ['low', 'medium', 'high', 'critical'];

// "1. Aksi | Expected;2. Aksi | Expected" -> detailed steps. A leading "N." ordinal on each
// segment is optional and stripped if present (matches how the simple-format examples in the
// UI hint text are written); the '|' is what actually decides detailed vs simple.
function parseStepsCell(raw: string): { stepType: TestCaseStepType; detailedSteps: ParsedTestCaseStep[] } {
  if (!raw.includes('|')) {
    return { stepType: 'simple', detailedSteps: [] };
  }

  const detailedSteps = raw
    .split(';')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => {
      const withoutOrdinal = segment.replace(/^\d+\.\s*/, '');
      const [actionPart, ...expectedParts] = withoutOrdinal.split('|');
      return {
        action: actionPart.trim(),
        expectedResult: expectedParts.join('|').trim() || null,
      };
    })
    .filter((step) => step.action !== '');

  return { stepType: 'detailed', detailedSteps };
}

// Minimal RFC 4180 parser: handles quoted fields containing commas, newlines, and escaped
// quotes ("") — the common cases spreadsheet software actually produces.
function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

export async function parseTestCaseCsv(file: File): Promise<{ valid: ParsedTestCaseRow[]; invalid: InvalidRow[] }> {
  const text = await file.text();
  const rows = parseCsvText(text);
  if (rows.length === 0) return { valid: [], invalid: [] };

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const colIndex = (name: string) => header.indexOf(name);
  const idx = {
    module: colIndex('module'),
    title: colIndex('title'),
    objective: colIndex('objective'),
    preconditions: colIndex('preconditions'),
    steps: colIndex('steps'),
    expectedResult: colIndex('expected result'),
    priority: colIndex('priority'),
    tags: colIndex('tags'),
    targetRole: colIndex('target role'),
  };

  if (idx.title === -1) {
    throw new Error(`The "Title" column is required in the header. Supported columns: ${EXPECTED_HEADERS.join(', ')}`);
  }

  const valid: ParsedTestCaseRow[] = [];
  const invalid: InvalidRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i];
    const rowNumber = i + 1; // 1-indexed, matching what a user sees in a spreadsheet
    const cell = (colIdx: number) => (colIdx >= 0 ? (cells[colIdx] ?? '').trim() : '');

    const title = cell(idx.title);
    if (!title) {
      invalid.push({ rowNumber, reason: 'Title is empty' });
      continue;
    }

    const priorityRaw = cell(idx.priority).toLowerCase();
    const priority = (PRIORITIES.includes(priorityRaw as TestCasePriority) ? priorityRaw : 'medium') as TestCasePriority;

    const stepsCell = cell(idx.steps);
    const { stepType, detailedSteps } = parseStepsCell(stepsCell);
    if (stepType === 'detailed' && detailedSteps.length === 0) {
      invalid.push({ rowNumber, reason: 'Steps contains "|" but no valid action found' });
      continue;
    }

    valid.push({
      rowNumber,
      moduleName: cell(idx.module) || null,
      title,
      objective: cell(idx.objective) || null,
      preconditions: cell(idx.preconditions) || null,
      steps: stepType === 'simple' ? stepsCell : '',
      stepType,
      detailedSteps,
      expectedResult: cell(idx.expectedResult),
      priority,
      tagNames: cell(idx.tags).split(',').map((t) => t.trim()).filter(Boolean),
      targetRole: cell(idx.targetRole) || null,
    });
  }

  return { valid, invalid };
}
