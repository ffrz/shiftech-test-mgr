import { Dialog } from 'primereact/dialog';
import { MultiSelect } from 'primereact/multiselect';
import { Button } from 'primereact/button';
import type { TestCase } from '../../../../types/domain';

type AddCaseToPlanDialogProps = {
  visible: boolean;
  onHide: () => void;
  availableCases: TestCase[];
  selectedCaseIds: string[];
  onSelectedCaseIdsChange: (value: string[]) => void;
  onAdd: () => void;
};

export function AddCaseToPlanDialog({ visible, onHide, availableCases, selectedCaseIds, onSelectedCaseIdsChange, onAdd }: AddCaseToPlanDialogProps) {
  return (
    <Dialog header="Add Test Case to Plan" visible={visible} onHide={onHide} style={{ width: '30rem' }}>
      <div className="flex flex-column gap-3">
        <MultiSelect
          value={selectedCaseIds}
          options={availableCases.map((c) => ({ label: `${c.code} — ${c.title}`, value: c.id }))}
          onChange={(e) => onSelectedCaseIdsChange(e.value)}
          placeholder="Select test case"
          filter
          display="chip"
          className="w-full"
        />
        <Button label="Add" size="small" onClick={onAdd} disabled={selectedCaseIds.length === 0} />
      </div>
    </Dialog>
  );
}
