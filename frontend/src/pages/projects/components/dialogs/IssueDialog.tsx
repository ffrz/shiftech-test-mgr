import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { Button } from 'primereact/button';
import type { IssuePriority, IssueType } from '../../../../types/domain';
import { ISSUE_PRIORITY_LABEL, ISSUE_TYPE_LABEL } from '../../../../helpers/statusLabels';

const ISSUE_PRIORITY_OPTIONS: { label: string; value: IssuePriority }[] = (
  ['low', 'medium', 'high', 'critical'] as const
).map((v) => ({ label: ISSUE_PRIORITY_LABEL[v], value: v }));

const ISSUE_TYPE_OPTIONS: { label: string; value: IssueType }[] = (
  ['bug', 'feature', 'improvement', 'task'] as const
).map((v) => ({ label: ISSUE_TYPE_LABEL[v], value: v }));

type IssueDialogProps = {
  visible: boolean;
  title: string;
  onTitleChange: (value: string) => void;
  type: IssueType;
  onTypeChange: (value: IssueType) => void;
  priority: IssuePriority;
  onPriorityChange: (value: IssuePriority) => void;
  moduleId: string | null;
  onModuleIdChange: (value: string | null) => void;
  moduleOptions: { label: string; value: string }[];
  tagNames: string[];
  onTagNamesChange: (value: string[]) => void;
  tagOptions: { label: string; value: string }[];
  description: string;
  onDescriptionChange: (value: string) => void;
  error: string | null;
  onHide: () => void;
  onSave: () => void;
  onQuickAddTag: () => void;
};

export function IssueDialog({
  visible,
  title,
  onTitleChange,
  type,
  onTypeChange,
  priority,
  onPriorityChange,
  moduleId,
  onModuleIdChange,
  moduleOptions,
  tagNames,
  onTagNamesChange,
  tagOptions,
  description,
  onDescriptionChange,
  error,
  onHide,
  onSave,
  onQuickAddTag,
}: IssueDialogProps) {
  return (
    <Dialog header="Create Issue" visible={visible} onHide={onHide} style={{ width: '32rem' }}>
      <div className="flex flex-column gap-3">
        {error && <small className="p-error">{error}</small>}
        <div className="flex flex-column gap-1">
          <label htmlFor="issue-new-title">Title</label>
          <InputText id="issue-new-title" value={title} onChange={(e) => onTitleChange(e.target.value)} autoFocus />
        </div>
        <div className="grid">
          <div className="col-12 md:col-6 flex flex-column gap-1">
            <label htmlFor="issue-new-type">Tipe</label>
            <Dropdown id="issue-new-type" value={type} options={ISSUE_TYPE_OPTIONS} onChange={(e) => onTypeChange(e.value)} className="w-full" />
          </div>
          <div className="col-12 md:col-6 flex flex-column gap-1">
            <label htmlFor="issue-new-priority">Priority</label>
            <Dropdown id="issue-new-priority" value={priority} options={ISSUE_PRIORITY_OPTIONS} onChange={(e) => onPriorityChange(e.value)} className="w-full" />
          </div>
        </div>
        <div className="flex flex-column gap-1">
          <label htmlFor="issue-new-module">Module (optional)</label>
          <Dropdown
            id="issue-new-module"
            value={moduleId}
            options={moduleOptions}
            onChange={(e) => onModuleIdChange(e.value)}
            showClear
            placeholder="Tidak terikat module"
            className="w-full"
          />
        </div>
        <div className="flex flex-column gap-1">
          <label htmlFor="issue-new-tags">Tag</label>
          <div className="flex align-items-center gap-1">
            <MultiSelect
              id="issue-new-tags"
              value={tagNames}
              options={tagOptions}
              onChange={(e) => onTagNamesChange(e.value ?? [])}
              placeholder="Select tags"
              display="chip"
              filter
              className="w-full"
            />
            <Button
              icon="pi pi-plus"
              type="button"
              text
              rounded
              size="small"
              aria-label="New Tag"
              onClick={onQuickAddTag}
              style={{ width: '2rem', height: '2rem', flexShrink: 0 }}
            />
          </div>
        </div>
        <div className="flex flex-column gap-1">
          <label htmlFor="issue-new-description">Description (optional)</label>
          <InputTextarea id="issue-new-description" value={description} onChange={(e) => onDescriptionChange(e.target.value)} rows={3} />
        </div>
        <Button label="Save" size="small" onClick={onSave} />
      </div>
    </Dialog>
  );
}
