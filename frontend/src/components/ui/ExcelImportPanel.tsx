import { useRef, useState } from 'react';
import { FileUpload, type FileUploadHandlerEvent } from 'primereact/fileupload';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { parseTestCaseCsv, type InvalidRow, type ParsedTestCaseRow } from '../../helpers/csvImport';
import { testCaseImportService } from '../../services/testCaseImportService';

// Reads a CSV file client-side (title/steps/expected result/etc — step_type 'simple' only,
// per product decision), previews parsed + invalid rows, and commits only the valid ones on
// confirm. "Excel" in the button label because Excel/Sheets both export CSV natively — no
// server round-trip or xlsx dependency needed for this.
export function ExcelImportPanel({ projectId, onImported }: { projectId: string; onImported: () => void | Promise<void> }) {
  const toast = useRef<Toast>(null);
  const [validRows, setValidRows] = useState<ParsedTestCaseRow[]>([]);
  const [invalidRows, setInvalidRows] = useState<InvalidRow[]>([]);
  const [parsed, setParsed] = useState(false);
  const [importing, setImporting] = useState(false);

  async function handleFile(event: FileUploadHandlerEvent) {
    const file = event.files[0];
    if (!file) return;
    try {
      const { valid, invalid } = await parseTestCaseCsv(file);
      setValidRows(valid);
      setInvalidRows(invalid);
      setParsed(true);
    } catch (err) {
      toast.current?.show({ severity: 'error', summary: 'Failed to read file', detail: err instanceof Error ? err.message : undefined });
    }
  }

  async function handleImport() {
    setImporting(true);
    try {
      await testCaseImportService.importRows(projectId, validRows);
      toast.current?.show({ severity: 'success', summary: `${validRows.length} test case(s) imported` });
      await onImported();
    } catch (err) {
      toast.current?.show({ severity: 'error', summary: 'Import failed', detail: err instanceof Error ? err.message : undefined });
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="flex flex-column gap-3">
      <Toast ref={toast} position="bottom-center" />

      {!parsed && (
        <>
          <p className="text-color-secondary text-sm m-0">
            CSV file with header: Module, Title, Objective, Preconditions, Steps, Expected Result, Priority, Tags,
            Target Role. Only <strong>Title</strong> is required. Tags are comma-separated. Save your Excel file as
            CSV first.
          </p>
          <FileUpload mode="basic" chooseLabel="Choose CSV File" accept=".csv" customUpload uploadHandler={handleFile} auto />
        </>
      )}

      {parsed && (
        <>
          <div className="flex align-items-center gap-2 text-sm">
            <Tag value={`${validRows.length} valid`} severity="success" />
            {invalidRows.length > 0 && <Tag value={`${invalidRows.length} invalid`} severity="danger" />}
            <Button label="Choose Another File" size="small" text onClick={() => setParsed(false)} />
          </div>

          {invalidRows.length > 0 && (
            <DataTable value={invalidRows} size="small" paginator paginatorTemplate="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown" currentPageReportTemplate="{totalRecords} records" rows={5} className="mb-2">
              <Column field="rowNumber" header="Row" style={{ width: '5rem' }} />
              <Column field="reason" header="Failure Reason" body={(row: InvalidRow) => <span className="text-red-500">{row.reason}</span>} />
            </DataTable>
          )}

          <DataTable value={validRows} size="small" paginator paginatorTemplate="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown" currentPageReportTemplate="{totalRecords} records" rows={5} emptyMessage="No valid rows to import.">
            <Column field="rowNumber" header="Row" style={{ width: '5rem' }} />
            <Column field="title" header="Title" />
            <Column field="moduleName" header="Module" body={(row: ParsedTestCaseRow) => row.moduleName ?? '-'} />
            <Column field="priority" header="Priority" />
            <Column field="targetRole" header="Target Role" body={(row: ParsedTestCaseRow) => row.targetRole ?? '-'} />
          </DataTable>

          <Button
            label={`Import ${validRows.length} Test Case`}
            size="small"
            loading={importing}
            disabled={validRows.length === 0}
            onClick={handleImport}
          />
        </>
      )}
    </div>
  );
}
