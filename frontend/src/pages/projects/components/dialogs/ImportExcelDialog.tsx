import { Dialog } from 'primereact/dialog';
import { ExcelImportPanel } from '../../../../components/ui/ExcelImportPanel';

type ImportExcelDialogProps = {
  visible: boolean;
  projectId: string;
  onHide: () => void;
  onImported: () => Promise<void>;
};

export function ImportExcelDialog({ visible, projectId, onHide, onImported }: ImportExcelDialogProps) {
  return (
    <Dialog header="Import CSV" visible={visible} onHide={onHide} style={{ width: '40rem' }}>
      <ExcelImportPanel projectId={projectId} onImported={async () => { await onImported(); onHide(); }} />
    </Dialog>
  );
}
