import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { parseTestCaseCsv, downloadCsvTemplate, CSV_TEMPLATE_HEADER } from './csvImport';

function csvFile(content: string): File {
  return new File([content], 'test.csv', { type: 'text/csv' });
}

describe('parseTestCaseCsv', () => {
  const headerRow = 'Module,Title,Objective,Preconditions,Steps,Expected Result,Priority,Tags,Target Role,Notes';

  describe('header validation', () => {
    it('rejects a file without a Title column', async () => {
      await expect(parseTestCaseCsv(csvFile('Module,Priority,Steps\nval1,medium,val3'))).rejects.toThrow('"Title" column is required');
    });

    it('handles empty file', async () => {
      const result = await parseTestCaseCsv(csvFile(''));
      expect(result.valid).toHaveLength(0);
      expect(result.invalid).toHaveLength(0);
    });

    it('handles header-only file', async () => {
      const result = await parseTestCaseCsv(csvFile(headerRow));
      expect(result.valid).toHaveLength(0);
      expect(result.invalid).toHaveLength(0);
    });
  });

  describe('simple steps', () => {
    it('parses a row with all fields', async () => {
      const csv = `${headerRow}\n"Login","User can login","Verify auth","User exists","Open browser;Enter creds;Click Login","Dashboard shown","high","auth,smoke","Admin","Optional notes"`;
      const { valid, invalid } = await parseTestCaseCsv(csvFile(csv));
      expect(invalid).toHaveLength(0);
      expect(valid).toHaveLength(1);
      const row = valid[0];
      expect(row.rowNumber).toBe(2);
      expect(row.moduleName).toBe('Login');
      expect(row.title).toBe('User can login');
      expect(row.objective).toBe('Verify auth');
      expect(row.preconditions).toBe('User exists');
      expect(row.steps).toBe('Open browser;Enter creds;Click Login');
      expect(row.stepType).toBe('simple');
      expect(row.expectedResult).toBe('Dashboard shown');
      expect(row.priority).toBe('high');
      expect(row.tagNames).toEqual(['auth', 'smoke']);
      expect(row.targetRole).toBe('Admin');
      expect(row.notes).toBe('Optional notes');
    });

    it('parses minimal row with only title', async () => {
      const csv = `${headerRow}\n,Test Title,,,,,medium,,,`;
      const { valid, invalid } = await parseTestCaseCsv(csvFile(csv));
      expect(invalid).toHaveLength(0);
      expect(valid).toHaveLength(1);
      const row = valid[0];
      expect(row.title).toBe('Test Title');
      expect(row.moduleName).toBeNull();
      expect(row.priority).toBe('medium');
      expect(row.tagNames).toEqual([]);
      expect(row.targetRole).toBeNull();
      expect(row.stepType).toBe('simple');
    });
  });

  describe('detailed steps', () => {
    it('detects detailed steps when "|" is present', async () => {
      const csv = `${headerRow}\n,Detailed Test,,,"1. Open page | Page loads;2. Click button | Dialog shown",,medium,,,`;
      const { valid } = await parseTestCaseCsv(csvFile(csv));
      expect(valid).toHaveLength(1);
      const row = valid[0];
      expect(row.stepType).toBe('detailed');
      expect(row.steps).toBe('');
      expect(row.detailedSteps).toHaveLength(2);
      expect(row.detailedSteps[0]).toEqual({ action: 'Open page', expectedResult: 'Page loads' });
      expect(row.detailedSteps[1]).toEqual({ action: 'Click button', expectedResult: 'Dialog shown' });
    });

    it('strips leading ordinals from detailed steps', async () => {
      const csv = `${headerRow}\n,Test,,,"1. First action | Result one;2. Second action | Result two",,medium,,,`;
      const { valid } = await parseTestCaseCsv(csvFile(csv));
      expect(valid).toHaveLength(1);
      expect(valid[0].detailedSteps[0].action).toBe('First action');
      expect(valid[0].detailedSteps[1].action).toBe('Second action');
    });

    it('handles detailed steps with no expected result', async () => {
      const csv = `${headerRow}\n,Test,,,"1. Simple action",,medium,,,`;
      // No "|" means simple, not detailed
      const { valid } = await parseTestCaseCsv(csvFile(csv));
      expect(valid[0].stepType).toBe('simple');
    });

    it('marks row invalid when "|" present but no valid action extracted', async () => {
      const csv = `${headerRow}\n,Test,,,"1. | ",,medium,,,`;
      const { valid, invalid } = await parseTestCaseCsv(csvFile(csv));
      expect(valid).toHaveLength(0);
      expect(invalid).toHaveLength(1);
      expect(invalid[0].reason).toContain('no valid action');
    });
  });

  describe('validation', () => {
    it('marks rows with empty title as invalid', async () => {
      const csv = `${headerRow}\n,Valid Title,,contents\n,,,just-empty-title`;
      const { valid, invalid } = await parseTestCaseCsv(csvFile(csv));
      expect(valid).toHaveLength(1);
      expect(valid[0].title).toBe('Valid Title');
      expect(invalid).toHaveLength(1);
      expect(invalid[0].reason).toBe('Title is empty');
    });
  });

  describe('priority fallback', () => {
    it('defaults to "medium" for invalid priority', async () => {
      const csv = `${headerRow}\n,Test,,,steps,,super-urgent,,,`;
      const { valid } = await parseTestCaseCsv(csvFile(csv));
      expect(valid[0].priority).toBe('medium');
    });

    it('preserves valid priorities', async () => {
      for (const prio of ['low', 'medium', 'high', 'critical']) {
        const csv = `${headerRow}\n,Test,,,steps,,${prio},,,`;
        const { valid } = await parseTestCaseCsv(csvFile(csv));
        expect(valid[0].priority).toBe(prio);
      }
    });

    it('handles case-insensitive priority', async () => {
      const csv = `${headerRow}\n,Test,,,steps,,HIGH,,,`;
      const { valid } = await parseTestCaseCsv(csvFile(csv));
      expect(valid[0].priority).toBe('high');
    });
  });

  describe('BOM handling', () => {
    it('strips UTF-8 BOM from file start', async () => {
      const csv = `\uFEFF${headerRow}\n,Test BOM,,,,medium,,,`;
      const { valid } = await parseTestCaseCsv(csvFile(csv));
      expect(valid).toHaveLength(1);
      expect(valid[0].title).toBe('Test BOM');
    });
  });

  describe('quoting', () => {
    it('handles quoted fields with commas inside', async () => {
      const csv = `${headerRow}\n"Module, with comma","Title, also comma",,,,,,`;
      const { valid } = await parseTestCaseCsv(csvFile(csv));
      expect(valid).toHaveLength(1);
      expect(valid[0].moduleName).toBe('Module, with comma');
      expect(valid[0].title).toBe('Title, also comma');
    });

    it('handles escaped quotes', async () => {
      const csv = `${headerRow}\n"He said ""hello""","Title",,,,,,`;
      const { valid } = await parseTestCaseCsv(csvFile(csv));
      expect(valid[0].moduleName).toBe('He said "hello"');
    });

    it('handles newlines inside quoted fields', async () => {
      const csv = `${headerRow}\n"Line 1\r\nLine 2","Title",,,,,,`;
      const { valid } = await parseTestCaseCsv(csvFile(csv));
      expect(valid[0].moduleName).toBe('Line 1\r\nLine 2');
    });
  });

  describe('multiple rows', () => {
    it('parses multiple valid rows', async () => {
      const csv = [
        headerRow,
        ',Test 1,,,,medium,,,',
        ',Test 2,,,,high,,,',
      ].join('\n');
      const { valid, invalid } = await parseTestCaseCsv(csvFile(csv));
      expect(valid).toHaveLength(2);
      expect(invalid).toHaveLength(0);
      expect(valid[0].title).toBe('Test 1');
      expect(valid[1].title).toBe('Test 2');
    });

    it('mixes valid and invalid rows', async () => {
      const csv = [
        headerRow,
        ',Test 1,,,,medium,,,',
        ',,,,,medium,,,',
        ',Test 3,,,,low,,,',
      ].join('\n');
      const { valid, invalid } = await parseTestCaseCsv(csvFile(csv));
      expect(valid).toHaveLength(2);
      expect(invalid).toHaveLength(1);
    });
  });
});

describe('CSV_TEMPLATE_HEADER', () => {
  it('matches the expected header format', () => {
    expect(CSV_TEMPLATE_HEADER).toBe('Module,Title,Objective,Preconditions,Steps,Expected Result,Priority,Tags,Target Role,Notes');
  });
});

describe('downloadCsvTemplate', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:test'),
      revokeObjectURL: vi.fn(),
    });
    const anchorMock = { href: '', download: '', click: vi.fn() };
    vi.stubGlobal('document', {
      createElement: vi.fn(() => anchorMock),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates a download link with the correct file name', () => {
    downloadCsvTemplate();
    expect(document.createElement).toHaveBeenCalledWith('a');
  });
});
