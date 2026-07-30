import { useEffect, useRef, useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Checkbox } from 'primereact/checkbox';
import { Button } from 'primereact/button';
import { FloatLabel } from 'primereact/floatlabel';
import { testPlanService } from '../../../../services/testPlanService';
import { testCaseService } from '../../../../services/testCaseService';
import { issueService } from '../../../../services/issueService';
import { projectDuplicateService } from '../../../../services/projectDuplicateService';
import type { IssueWithDetails, Project, TestCaseWithDetails, TestPlan } from '../../../../types/domain';

interface DuplicateProjectDialogProps {
  source: Project | null;
  onHide: () => void;
  onDuplicated: (newProjectId: string) => void;
}

export function DuplicateProjectDialog({ source, onHide, onDuplicated }: DuplicateProjectDialogProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const [sourceTestPlans, setSourceTestPlans] = useState<TestPlan[]>([]);
  const [sourceTestCases, setSourceTestCases] = useState<TestCaseWithDetails[]>([]);
  const [sourceIssues, setSourceIssues] = useState<IssueWithDetails[]>([]);

  const [selectedTestPlanIds, setSelectedTestPlanIds] = useState<Set<string>>(new Set());
  const [selectedTestCaseIds, setSelectedTestCaseIds] = useState<Set<string>>(new Set());
  const [selectedIssueIds, setSelectedIssueIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!source) return;
    setName(`${source.name} (Copy)`);
    setError(null);
    Promise.all([
      testPlanService.listByProject(source.id),
      testCaseService.listByProjectWithDetails(source.id),
      issueService.listByProject(source.id),
    ]).then(([plans, cases, issues]) => {
      setSourceTestPlans(plans);
      setSourceTestCases(cases);
      setSourceIssues(issues);
      setSelectedTestPlanIds(new Set(plans.map((p) => p.id)));
      setSelectedTestCaseIds(new Set(cases.map((c) => c.id)));
      setSelectedIssueIds(new Set(issues.map((i) => i.id)));
    });
  }, [source]);

  useEffect(() => {
    if (error && nameRef.current) {
      nameRef.current.focus();
      nameRef.current.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    }
  }, [error]);

  function toggleSelection(set: Set<string>, setSet: (s: Set<string>) => void, id: string, checked: boolean) {
    const next = new Set(set);
    if (checked) next.add(id);
    else next.delete(id);
    setSet(next);
  }

  async function handleDuplicate() {
    if (!source) return;
    setError(null);
    setLoading(true);
    try {
      const created = await projectDuplicateService.duplicateProject(
        name,
        {
          testPlanIds: [...selectedTestPlanIds],
          testCaseIds: [...selectedTestCaseIds],
          issueIds: [...selectedIssueIds],
        },
        { testPlans: sourceTestPlans, testCases: sourceTestCases, issues: sourceIssues },
      );
      onDuplicated(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate project');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog header="Duplicate Project" visible={!!source} onHide={onHide} style={{ width: '40rem' }}>
      <div className="flex flex-column gap-3">
        <div className="flex flex-column gap-1">
          <FloatLabel className="ifta-field">
            <InputText id="duplicate-project-name" ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} className={error ? 'p-invalid w-full' : 'w-full'} autoFocus />
            <label htmlFor="duplicate-project-name" className={error ? 'p-error' : ''}>New Project Name</label>
          </FloatLabel>
          {error && <small className="p-error">{error}</small>}
        </div>

        <div className="flex flex-column gap-1">
          <div className="flex align-items-center justify-content-between">
            <label className="font-medium">Test Plan ({selectedTestPlanIds.size}/{sourceTestPlans.length})</label>
            <div className="flex align-items-center gap-2">
              <Checkbox
                checked={sourceTestPlans.length > 0 && selectedTestPlanIds.size === sourceTestPlans.length}
                onChange={(e) => setSelectedTestPlanIds(e.checked ? new Set(sourceTestPlans.map((p) => p.id)) : new Set())}
              />
              <span className="text-sm text-color-secondary">Select All</span>
            </div>
          </div>
          <div className="flex flex-column gap-1 p-2 border-round" style={{ border: '1px solid var(--surface-border)', maxHeight: '10rem', overflowY: 'auto' }}>
            {sourceTestPlans.length === 0 && <span className="text-sm text-color-secondary">No test plans.</span>}
            {sourceTestPlans.map((p) => (
              <div key={p.id} className="flex align-items-center gap-2">
                <Checkbox
                  inputId={`plan-${p.id}`}
                  checked={selectedTestPlanIds.has(p.id)}
                  onChange={(e) => toggleSelection(selectedTestPlanIds, setSelectedTestPlanIds, p.id, e.checked ?? false)}
                />
                <label htmlFor={`plan-${p.id}`} className="text-sm">{p.code} — {p.name}</label>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-column gap-1">
          <div className="flex align-items-center justify-content-between">
            <label className="font-medium">Test Case ({selectedTestCaseIds.size}/{sourceTestCases.length})</label>
            <div className="flex align-items-center gap-2">
              <Checkbox
                checked={sourceTestCases.length > 0 && selectedTestCaseIds.size === sourceTestCases.length}
                onChange={(e) => setSelectedTestCaseIds(e.checked ? new Set(sourceTestCases.map((c) => c.id)) : new Set())}
              />
              <span className="text-sm text-color-secondary">Select All</span>
            </div>
          </div>
          <div className="flex flex-column gap-1 p-2 border-round" style={{ border: '1px solid var(--surface-border)', maxHeight: '10rem', overflowY: 'auto' }}>
            {sourceTestCases.length === 0 && <span className="text-sm text-color-secondary">No test cases.</span>}
            {sourceTestCases.map((c) => (
              <div key={c.id} className="flex align-items-center gap-2">
                <Checkbox
                  inputId={`case-${c.id}`}
                  checked={selectedTestCaseIds.has(c.id)}
                  onChange={(e) => toggleSelection(selectedTestCaseIds, setSelectedTestCaseIds, c.id, e.checked ?? false)}
                />
                <label htmlFor={`case-${c.id}`} className="text-sm">{c.code} — {c.title}</label>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-column gap-1">
          <div className="flex align-items-center justify-content-between">
            <label className="font-medium">Issue ({selectedIssueIds.size}/{sourceIssues.length})</label>
            <div className="flex align-items-center gap-2">
              <Checkbox
                checked={sourceIssues.length > 0 && selectedIssueIds.size === sourceIssues.length}
                onChange={(e) => setSelectedIssueIds(e.checked ? new Set(sourceIssues.map((i) => i.id)) : new Set())}
              />
              <span className="text-sm text-color-secondary">Select All</span>
            </div>
          </div>
          <div className="flex flex-column gap-1 p-2 border-round" style={{ border: '1px solid var(--surface-border)', maxHeight: '10rem', overflowY: 'auto' }}>
            {sourceIssues.length === 0 && <span className="text-sm text-color-secondary">No issues.</span>}
            {sourceIssues.map((i) => (
              <div key={i.id} className="flex align-items-center gap-2">
                <Checkbox
                  inputId={`issue-${i.id}`}
                  checked={selectedIssueIds.has(i.id)}
                  onChange={(e) => toggleSelection(selectedIssueIds, setSelectedIssueIds, i.id, e.checked ?? false)}
                />
                <label htmlFor={`issue-${i.id}`} className="text-sm">{i.code} — {i.title}</label>
              </div>
            ))}
          </div>
        </div>

        <Button label="Duplicate Project" size="small" loading={loading} onClick={handleDuplicate} />
      </div>
    </Dialog>
  );
}
