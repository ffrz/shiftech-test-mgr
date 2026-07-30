import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { Button } from 'primereact/button';
import { FloatLabel } from 'primereact/floatlabel';
import type { TestSuiteItem } from '../../../../types/domain';

type TestSuiteOption = { id: string; name: string };

type ImportTemplateDialogProps = {
  visible: boolean;
  templateId: string | null;
  onSelectTemplate: (id: string | null) => void;
  templates: TestSuiteOption[];
  items: TestSuiteItem[];
  itemIds: string[];
  onItemIdsChange: (value: string[]) => void;
  loading: boolean;
  onHide: () => void;
  onImport: () => void;
};

export function ImportTemplateDialog({
  visible,
  templateId,
  onSelectTemplate,
  templates,
  items,
  itemIds,
  onItemIdsChange,
  loading,
  onHide,
  onImport,
}: ImportTemplateDialogProps) {
  return (
    <Dialog header="Import from Template" visible={visible} onHide={onHide} style={{ width: '34rem' }}>
      <div className="flex flex-column gap-2">
        <div className="flex flex-column">
          <FloatLabel className="ifta-field">
            <Dropdown
              id="import-template"
              value={templateId}
              options={templates.map((t) => ({ label: t.name, value: t.id }))}
              onChange={(e) => onSelectTemplate(e.value)}
              className="w-full"
              filter
            />
            <label htmlFor="import-template">Template</label>
          </FloatLabel>
        </div>
        {templateId && (
          <div className="flex flex-column">
            <FloatLabel className="ifta-field">
              <MultiSelect
                id="import-template-items"
                value={itemIds}
                options={items.map((i) => ({ label: i.title, value: i.id }))}
                onChange={(e) => onItemIdsChange(e.value ?? [])}
                filter
                display="chip"
                className="w-full"
              />
              <label htmlFor="import-template-items">Item</label>
            </FloatLabel>
          </div>
        )}
        <Button
          label={`Import ${itemIds.length > 0 ? itemIds.length : ''} Test Case`}
          size="small"
          loading={loading}
          disabled={itemIds.length === 0}
          onClick={onImport}
        />
      </div>
    </Dialog>
  );
}
