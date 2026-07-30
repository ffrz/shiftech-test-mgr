import { useEffect, useRef } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { CharacterCount } from '../../../../components/ui/CharacterCount';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { SelectButton } from 'primereact/selectbutton';
import { Button } from 'primereact/button';
import { FloatLabel } from 'primereact/floatlabel';
import type { TestCase, TestCasePriority } from '../../../../types/domain';
import { TEST_CASE_PRIORITY_LABEL } from '../../../../helpers/statusLabels';

const PRIORITY_OPTIONS: { label: string; value: TestCasePriority }[] = [
  { label: TEST_CASE_PRIORITY_LABEL.low, value: 'low' },
  { label: TEST_CASE_PRIORITY_LABEL.medium, value: 'medium' },
  { label: TEST_CASE_PRIORITY_LABEL.high, value: 'high' },
  { label: TEST_CASE_PRIORITY_LABEL.critical, value: 'critical' },
];

type DetailedStep = { action: string; expectedResult: string };

type TestCaseDialogProps = {
  visible: boolean;
  editing: boolean;
  code: string;
  onCodeChange: (value: string) => void;
  moduleId: string | null;
  onModuleIdChange: (value: string | null) => void;
  moduleOptions: { label: string; value: string }[];
  onQuickAddModule: () => void;
  priority: TestCasePriority;
  onPriorityChange: (value: TestCasePriority) => void;
  targetRoleId: string | null;
  onTargetRoleIdChange: (value: string | null) => void;
  testRoleOptions: { label: string; value: string }[];
  onQuickAddTestRole: () => void;
  title: string;
  onTitleChange: (value: string) => void;
  objective: string;
  onObjectiveChange: (value: string) => void;
  preconditions: string;
  onPreconditionsChange: (value: string) => void;
  stepType: TestCase['stepType'];
  onStepTypeChange: (value: TestCase['stepType']) => void;
  steps: string;
  onStepsChange: (value: string) => void;
  expectedResult: string;
  onExpectedResultChange: (value: string) => void;
  detailedSteps: DetailedStep[];
  onDetailedStepsChange: (value: DetailedStep[]) => void;
  tags: string[];
  onTagsChange: (value: string[]) => void;
  tagOptions: { label: string; value: string }[];
  onQuickAddTag: () => void;
  notes: string;
  onNotesChange: (value: string) => void;
  error: string | null;
  onHide: () => void;
  onSave: () => void;
};

export function TestCaseDialog({
  visible,
  editing,
  code,
  onCodeChange,
  moduleId,
  onModuleIdChange,
  moduleOptions,
  onQuickAddModule,
  priority,
  onPriorityChange,
  targetRoleId,
  onTargetRoleIdChange,
  testRoleOptions,
  onQuickAddTestRole,
  title,
  onTitleChange,
  objective,
  onObjectiveChange,
  preconditions,
  onPreconditionsChange,
  stepType,
  onStepTypeChange,
  steps,
  onStepsChange,
  expectedResult,
  onExpectedResultChange,
  detailedSteps,
  onDetailedStepsChange,
  tags,
  onTagsChange,
  tagOptions,
  onQuickAddTag,
  notes,
  onNotesChange,
  error,
  onHide,
  onSave,
}: TestCaseDialogProps) {
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (error && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    }
  }, [error]);

  return (
    <Dialog header={editing ? 'Edit Test Case' : 'New Test Case'} visible={visible} onHide={onHide} style={{ width: '40rem' }}>
      <div className="flex flex-column gap-2">
        <div className="flex flex-column">
          <FloatLabel className="ifta-field">
            <InputText id="case-code" value={code} onChange={(e) => onCodeChange(e.target.value)} className="w-14rem" />
            <label htmlFor="case-code">Code (automatic if empty)</label>
          </FloatLabel>
        </div>

        <div className="flex flex-column gap-1">
          <FloatLabel className="ifta-field">
            <InputText id="case-title" ref={titleRef} value={title} onChange={(e) => onTitleChange(e.target.value)} className={error ? 'p-invalid w-full' : 'w-full'} autoFocus />
            <label htmlFor="case-title" className={error ? 'p-error' : ''}>Title</label>
          </FloatLabel>
          {error && <small className="p-error">{error}</small>}
        </div>

        <div className="grid">
          <div className="col-12 md:col-6 flex flex-column">
            <div className="flex align-items-center gap-2">
              <FloatLabel className="ifta-field flex-grow-1">
                <Dropdown
                  id="case-module"
                  value={moduleId}
                  options={moduleOptions}
                  onChange={(e) => onModuleIdChange(e.value)}
                  editable
                  showClear
                  className="w-full"
                  virtualScrollerOptions={{ itemSize: 40 }}
                />
                <label htmlFor="case-module">Module</label>
              </FloatLabel>
              <Button
                icon="pi pi-plus"
                type="button"
                text
                rounded
                size="small"
                aria-label="Add Module"
                className="btn-xs"
                onClick={onQuickAddModule}
                style={{ width: '2rem', height: '2rem', flexShrink: 0 }}
              />
            </div>
          </div>
          <div className="col-12 md:col-6 flex flex-column">
            <FloatLabel className="ifta-field">
              <Dropdown
                id="case-priority"
                value={priority}
                options={PRIORITY_OPTIONS}
                onChange={(e) => onPriorityChange(e.value)}
                className="w-full"
              />
              <label htmlFor="case-priority">Priority</label>
            </FloatLabel>
          </div>
          <div className="col-12 md:col-6 flex flex-column">
            <div className="flex align-items-center gap-2">
              <FloatLabel className="ifta-field flex-grow-1">
                <Dropdown
                  id="case-target-role"
                  value={targetRoleId}
                  options={testRoleOptions}
                  onChange={(e) => onTargetRoleIdChange(e.value)}
                  editable
                  showClear
                  className="w-full"
                />
                <label htmlFor="case-target-role">Target Role (optional)</label>
              </FloatLabel>
              <Button
                icon="pi pi-plus"
                type="button"
                text
                rounded
                size="small"
                aria-label="Add Role"
                className="btn-xs"
                onClick={onQuickAddTestRole}
                style={{ width: '2rem', height: '2rem', flexShrink: 0 }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-column">
          <FloatLabel className="ifta-field">
            <InputText id="case-objective" value={objective} onChange={(e) => onObjectiveChange(e.target.value)} className="w-full" />
            <label htmlFor="case-objective">Objective (optional)</label>
          </FloatLabel>
        </div>

        <div className="flex flex-column gap-1">
          <FloatLabel className="ifta-field">
            <InputTextarea id="case-preconditions" value={preconditions} onChange={(e) => onPreconditionsChange(e.target.value)} rows={1} autoResize maxLength={1000} className="w-full" />
            <label htmlFor="case-preconditions">Preconditions</label>
          </FloatLabel>
          <CharacterCount value={preconditions} maxLength={1000} />
        </div>

        <div className="my-3">
          <SelectButton
            value={stepType}
            options={[
              { label: 'Single Step', value: 'simple' },
              { label: 'Detailed Step ', value: 'detailed' },
            ]}
            onChange={(e) => e.value && onStepTypeChange(e.value)}
          />
        </div>

        {stepType === 'simple' ? (
          <>
            <div className="flex flex-column gap-1">
              <FloatLabel className="ifta-field">
                <InputTextarea id="case-steps" value={steps} onChange={(e) => onStepsChange(e.target.value)} rows={1} autoResize maxLength={1000} className="w-full" />
                <label htmlFor="case-steps">Test Steps</label>
              </FloatLabel>
              <CharacterCount value={steps} maxLength={1000} />
            </div>

            <div className="flex flex-column gap-1">
              <FloatLabel className="ifta-field">
                <InputTextarea id="case-expected" value={expectedResult} onChange={(e) => onExpectedResultChange(e.target.value)} rows={1} autoResize maxLength={1000} className="w-full" />
                <label htmlFor="case-expected">Expected Result</label>
              </FloatLabel>
              <CharacterCount value={expectedResult} maxLength={1000} />
            </div>
          </>
        ) : (
          <div className="flex flex-column gap-2">
            <label>Test Steps (Detailed)</label>
            {detailedSteps.map((step, i) => (
              <div key={i} className="flex gap-2 align-items- p-2 border-round surface-100">
                <span className="text-color-secondary text-sm mt-2">{i + 1}.</span>
                <div className="flex flex-column gap-1 flex-grow-1">
                  <InputText
                    placeholder="Action"
                    value={step.action}
                    onChange={(e) =>
                      onDetailedStepsChange(detailedSteps.map((s, idx) => (idx === i ? { ...s, action: e.target.value } : s)))
                    }
                  />
                  <InputText
                    placeholder="Expected result (optional)"
                    value={step.expectedResult}
                    onChange={(e) =>
                      onDetailedStepsChange(detailedSteps.map((s, idx) => (idx === i ? { ...s, expectedResult: e.target.value } : s)))
                    }
                  />
                </div>
                <Button icon="pi pi-times" text size="small" rounded className="btn-xs" onClick={() => onDetailedStepsChange(detailedSteps.filter((_, idx) => idx !== i))} />
              </div>
            ))}
            <Button
              label="Add Step"
              icon="pi pi-plus"
              text
              size="small"
              onClick={() => onDetailedStepsChange([...detailedSteps, { action: '', expectedResult: '' }])}
            />
          </div>
        )}

        <div className="flex flex-column">
          <div className="flex align-items-center gap-2">
            <FloatLabel className="ifta-field flex-grow-1">
              <MultiSelect
                id="case-tags"
                value={tags}
                options={tagOptions}
                onChange={(e) => onTagsChange(e.value ?? [])}
                display="chip"
                filter
                className="w-full"
                virtualScrollerOptions={{ itemSize: 40 }}
              />
              <label htmlFor="case-tags">Tag</label>
            </FloatLabel>
            <Button icon="pi pi-plus" type="button" text rounded size="small" className="btn-xs" aria-label="New Tag" onClick={onQuickAddTag} style={{ width: '2rem', height: '2rem', flexShrink: 0 }} />
          </div>
        </div>

        <div className="flex flex-column gap-1">
          <FloatLabel className="ifta-field">
            <InputTextarea id="case-notes" value={notes} onChange={(e) => onNotesChange(e.target.value)} rows={1} autoResize maxLength={1000} className="w-full" />
            <label htmlFor="case-notes">Notes (optional)</label>
          </FloatLabel>
          <CharacterCount value={notes} maxLength={1000} />
        </div>

        <Button label="Save" size="small" onClick={onSave} />
      </div>
    </Dialog>
  );
}
