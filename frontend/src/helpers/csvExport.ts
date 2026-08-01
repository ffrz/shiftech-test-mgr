import { CSV_TEMPLATE_HEADER } from './csvImport';
import type { TestSuiteItemWithSteps } from '../types/domain';

// CSV export for Test Suite items. The output mirrors the shared import format
// (CSV_TEMPLATE_HEADER / parseTestCaseCsv) so an exported suite can be re-imported
// without loss: detailed items serialize their steps as "N. action | expected"
// segments joined by ";", which parseStepsCell round-trips back into step rows.

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatStepsCell(item: TestSuiteItemWithSteps): string {
  if (item.stepType === 'detailed') {
    return item.detailedSteps
      .map((step, i) => {
        const expected = step.expectedResult ? ` | ${step.expectedResult}` : '';
        return `${i + 1}. ${step.action}${expected}`;
      })
      .join(';');
  }
  return item.steps;
}

export function downloadTestSuiteCsv(items: TestSuiteItemWithSteps[], suiteName: string) {
  const rows = items.map((item) => [
    item.moduleName ?? '',
    item.title,
    item.objective ?? '',
    item.preconditions ?? '',
    formatStepsCell(item),
    item.expectedResult,
    item.priority,
    item.tagNames.join(','),
    item.targetRole ?? '',
    item.notes ?? '',
  ]);

  const csvContent = [CSV_TEMPLATE_HEADER, ...rows.map((row) => row.map(escapeCsvField).join(','))].join('\r\n');
  const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeName = suiteName.replace(/[\\/:*?"<>|]/g, '_').trim() || 'test-suite';
  link.download = `${safeName}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
