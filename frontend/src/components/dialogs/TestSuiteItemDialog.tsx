import { useEffect, useRef, useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { CharacterCount } from '../ui/CharacterCount';
import { Dropdown } from 'primereact/dropdown';
import { SelectButton } from 'primereact/selectbutton';
import { FloatLabel } from 'primereact/floatlabel';
import { Button } from 'primereact/button';
import { testSuiteService } from '../../services/testSuiteService';
import type { TestCasePriority, TestCaseStepType, TestSuiteItem } from '../../types/domain';
import { TEST_CASE_PRIORITY_LABEL } from '../../helpers/statusLabels';

const PRIORITY_OPTIONS: { label: string; value: TestCasePriority }[] = (
  ['low', 'medium', 'high', 'critical'] as const
).map((v) => ({ label: TEST_CASE_PRIORITY_LABEL[v], value: v }));

const STEP_TYPE_OPTIONS = [
  { label: 'Simple', value: 'simple' },
  { label: 'Detailed', value: 'detailed' },
];

type TestSuiteItemDialogMode = 'create' | 'edit' | 'duplicate';

type TestSuiteItemDialogProps = {
  visible: boolean;
  mode: TestSuiteItemDialogMode;
  item?: TestSuiteItem | null;
  suiteId: string;
  nextOrderIndex?: number;
  onHide: () => void;
  onSaved: () => void;
};

export function TestSuiteItemDialog({ visible, mode, item, suiteId, nextOrderIndex, onHide, onSaved }: TestSuiteItemDialogProps) {
  const [moduleName, setModuleName] = useState('');
  const [title, setTitle] = useState('');
  const [objective, setObjective] = useState('');
  const [preconditions, setPreconditions] = useState('');
  const [steps, setSteps] = useState('');
  const [expectedResult, setExpectedResult] = useState('');
  const [priority, setPriority] = useState<TestCasePriority>('medium');
  const [targetRole, setTargetRole] = useState('');
  const [tagNames, setTagNames] = useState('');
  const [stepType, setStepType] = useState<TestCaseStepType>('simple');
  const [detailedSteps, setDetailedSteps] = useState<{ action: string; expectedResult: string }[]>([]);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const stepsRef = useRef<HTMLTextAreaElement>(null);
  const expectedRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (errors.title && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    } else if (errors.steps && stepsRef.current) {
      stepsRef.current.focus();
      stepsRef.current.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    } else if (errors.expectedResult && expectedRef.current) {
      expectedRef.current.focus();
      expectedRef.current.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    }
  }, [errors]);

  useEffect(() => {
    if (!visible) return;
    const source = item ?? null;
    setModuleName(source?.moduleName ?? '');
    setTitle(mode === 'duplicate' && source ? `${source.title} (Copy)` : source?.title ?? '');
    setObjective(source?.objective ?? '');
    setPreconditions(source?.preconditions ?? '');
    setSteps(source?.steps ?? '');
    setExpectedResult(source?.expectedResult ?? '');
    setPriority(source?.priority ?? 'medium');
    setTargetRole(source?.targetRole ?? '');
    setTagNames(source?.tagNames.join(', ') ?? '');
    setStepType(source?.stepType ?? 'simple');
    setNotes(source?.notes ?? '');
    setErrors({});
    setSubmitting(false);
    setDetailedSteps([]);
    if (source?.stepType === 'detailed') {
      if (Array.isArray((source as TestSuiteItem & { detailedSteps?: unknown[] }).detailedSteps)) {
        setDetailedSteps((source as TestSuiteItem & { detailedSteps: { action: string; expectedResult?: string }[] }).detailedSteps.map((s) => ({ action: s.action, expectedResult: s.expectedResult ?? '' })));
      } else {
        testSuiteService.getItemWithSteps(source).then((withSteps) => {
          setDetailedSteps(withSteps.detailedSteps.map((s) => ({ action: s.action, expectedResult: s.expectedResult ?? '' })));
        });
      }
    }
  }, [visible, item, mode]);

  function mapServiceError(msg: string): Record<string, string> {
    if (msg.includes('title cannot be empty')) return { title: msg };
    if (msg.includes('Test steps cannot be empty')) return { steps: msg };
    if (msg.includes('Expected result cannot be empty')) return { expectedResult: msg };
    if (msg.includes('must have at least one step')) return { detailedSteps: msg };
    return { title: msg };
  }

  async function handleSave() {
    if (!suiteId) return;
    setErrors({});
    const tagList = tagNames.split(',').map((t) => t.trim()).filter(Boolean);
    setSubmitting(true);
    try {
      if (mode === 'edit' && item) {
        await testSuiteService.updateItem(
          item.id,
          {
            moduleName: moduleName.trim() || null,
            title,
            objective: objective.trim() || null,
            preconditions: preconditions.trim() || null,
            steps,
            expectedResult,
            priority,
            targetRole: targetRole.trim() || null,
            tagNames: tagList,
            stepType,
            notes: notes.trim() || null,
          },
          stepType === 'detailed' ? detailedSteps : undefined,
        );
      } else {
        await testSuiteService.addItem({
          suiteId,
          moduleName: mode === 'duplicate' ? (moduleName.trim() || undefined) : moduleName,
          title,
          objective: objective.trim() || undefined,
          preconditions: preconditions.trim() || undefined,
          steps,
          expectedResult,
          priority,
          targetRole: mode === 'duplicate' ? (targetRole.trim() || undefined) : targetRole,
          tagNames: tagList,
          stepType,
          notes: notes.trim() || undefined,
          detailedSteps: stepType === 'detailed' ? detailedSteps : undefined,
          orderIndex: nextOrderIndex ?? 0,
        });
      }
      onHide();
      await onSaved();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save item';
      setErrors(mapServiceError(msg));
    } finally {
      setSubmitting(false);
    }
  }

  const header = mode === 'edit' ? 'Edit Item' : mode === 'duplicate' ? 'Duplicate Item' : 'New Item';

  return (
    <Dialog header={header} visible={visible} onHide={onHide} style={{ width: '40rem' }}>
      <div className="flex flex-column gap-2">
        <div className="flex flex-column gap-1">
          <FloatLabel className="ifta-field">
            <InputText id="item-title" ref={titleRef} value={title} onChange={(e) => { setTitle(e.target.value); setErrors({}); }} className={errors.title ? 'p-invalid w-full' : 'w-full'} autoFocus />
            <label htmlFor="item-title" className={errors.title ? 'p-error' : ''}>Title</label>
          </FloatLabel>
          {errors.title && <small className="p-error">{errors.title}</small>}
        </div>

        <div className="grid">
          <div className="col-12 md:col-6 flex flex-column">
            <FloatLabel className="ifta-field">
              <Dropdown id="item-priority" value={priority} options={PRIORITY_OPTIONS} onChange={(e) => setPriority(e.value)} className="w-full" />
              <label htmlFor="item-priority">Priority</label>
            </FloatLabel>
          </div>

          <div className="col-12 md:col-6 flex flex-column">
            <FloatLabel className="ifta-field">
              <InputText id="item-module" value={moduleName} onChange={(e) => setModuleName(e.target.value)} className="w-full" />
              <label htmlFor="item-module">Module (optional)</label>
            </FloatLabel>
          </div>
        </div>

        <div className="flex flex-column">
          <FloatLabel className="ifta-field">
            <InputText id="item-role" value={targetRole} onChange={(e) => setTargetRole(e.target.value)} className="w-full" />
            <label htmlFor="item-role">Role Target (optional, ex. Admin, Manager, Member)</label>
          </FloatLabel>
        </div>

        <div className="flex flex-column">
          <FloatLabel className="ifta-field">
            <InputText id="item-tags" value={tagNames} onChange={(e) => setTagNames(e.target.value)} className="w-full" />
            <label htmlFor="item-tags">Tags (comma-separated, ex. Regression, Smoke)</label>
          </FloatLabel>
        </div>

        <div className="flex flex-column">
          <FloatLabel className="ifta-field">
            <InputTextarea id="item-objective" value={objective} onChange={(e) => setObjective(e.target.value)} className="w-full" autoResize maxLength={1000} />
            <label htmlFor="item-objective">Objective (optional)</label>
          </FloatLabel>
        </div>

        <div className="flex flex-column gap-1">
          <FloatLabel className="ifta-field">
            <InputTextarea id="item-preconditions" value={preconditions} onChange={(e) => setPreconditions(e.target.value)} rows={1} autoResize maxLength={1000} className="w-full" />
            <label htmlFor="item-preconditions">Prerequisites</label>
          </FloatLabel>
          <CharacterCount value={preconditions} maxLength={1000} />
        </div>

        <div className="flex flex-column">
          <label className="text-sm text-color-secondary mb-1">Step Mode</label>
          <SelectButton
            value={stepType}
            options={STEP_TYPE_OPTIONS}
            onChange={(e) => { if (e.value) { setStepType(e.value); setErrors({}); } }}
          />
        </div>

        {stepType === 'simple' ? (
          <>
            <div className="flex flex-column gap-1">
              <FloatLabel className="ifta-field">
                <InputTextarea id="item-steps" ref={stepsRef} value={steps} onChange={(e) => { setSteps(e.target.value); setErrors({}); }} rows={1} autoResize maxLength={1000} className={errors.steps ? 'p-invalid w-full' : 'w-full'} />
                <label htmlFor="item-steps" className={errors.steps ? 'p-error' : ''}>Test Steps</label>
              </FloatLabel>
              <CharacterCount value={steps} maxLength={1000} />
              {errors.steps && <small className="p-error">{errors.steps}</small>}
            </div>
            <div className="flex flex-column gap-1">
              <FloatLabel className="ifta-field">
                <InputTextarea id="item-expected" ref={expectedRef} value={expectedResult} onChange={(e) => { setExpectedResult(e.target.value); setErrors({}); }} rows={1} autoResize maxLength={1000} className={errors.expectedResult ? 'p-invalid w-full' : 'w-full'} />
                <label htmlFor="item-expected" className={errors.expectedResult ? 'p-error' : ''}>Expected Result</label>
              </FloatLabel>
              <CharacterCount value={expectedResult} maxLength={1000} />
              {errors.expectedResult && <small className="p-error">{errors.expectedResult}</small>}
            </div>
          </>
        ) : (
          <div className="flex flex-column gap-2">
            <label>Test Steps (Detailed)</label>
            {detailedSteps.map((step, i) => (
              <div key={i} className="flex gap-2 align-items-start p-2 border-round surface-100">
                <span className="text-color-secondary text-sm mt-2">{i + 1}.</span>
                <div className="flex flex-column gap-1 flex-grow-1">
                  <InputText
                    placeholder="Action"
                    value={step.action}
                    onChange={(e) => setDetailedSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, action: e.target.value } : s)))}
                  />
                  <InputText
                    placeholder="Expected result (optional)"
                    value={step.expectedResult}
                    onChange={(e) => setDetailedSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, expectedResult: e.target.value } : s)))}
                  />
                </div>
                <Button icon="pi pi-times" text size="small" onClick={() => setDetailedSteps((prev) => prev.filter((_, idx) => idx !== i))} />
              </div>
            ))}
            <Button
              label="Add Step"
              icon="pi pi-plus"
              text
              size="small"
              onClick={() => setDetailedSteps((prev) => [...prev, { action: '', expectedResult: '' }])}
            />
          </div>
        )}

        <div className="flex flex-column gap-1">
          <FloatLabel className="ifta-field">
            <InputTextarea id="item-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} autoResize maxLength={2000} className="w-full" />
            <label htmlFor="item-notes">Notes (optional)</label>
          </FloatLabel>
          <CharacterCount value={notes} maxLength={2000} />
        </div>

        <div className="my-2"></div>

        <Button label="Save" size="small" onClick={handleSave} loading={submitting} />
      </div>
    </Dialog>
  );
}
