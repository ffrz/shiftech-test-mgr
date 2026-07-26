import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { Button } from 'primereact/button';
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
      <div className="flex flex-column gap-3">
        <div className="flex flex-column gap-1">
          <label htmlFor="import-template">Template</label>
          <Dropdown
            id="import-template"
            value={templateId}
            options={templates.map((t) => ({ label: t.name, value: t.id }))}
            onChange={(e) => onSelectTemplate(e.value)}
            placeholder="Select template"
            className="w-full"
            filter
          />
        </div>
        {templateId && (
          <div className="flex flex-column gap-1">
            <label htmlFor="import-template-items">Item</label>
            <MultiSelect
              id="import-template-items"
              value={itemIds}
              options={items.map((i) => ({ label: i.title, value: i.id }))}
              onChange={(e) => onItemIdsChange(e.value ?? [])}
              placeholder="Select test case items"
              filter
              display="chip"
              className="w-full"
            />
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
