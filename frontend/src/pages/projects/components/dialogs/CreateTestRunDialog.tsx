import { useEffect, useRef, useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { SelectButton } from 'primereact/selectbutton';
import { Button } from 'primereact/button';
import { FloatLabel } from 'primereact/floatlabel';
import type { Module, Tag as TagEntity, TestCasePriority, TestCaseWithDetails, TestPlan, TestRole } from '../../../../types/domain';
import { TEST_CASE_PRIORITY_LABEL } from '../../../../helpers/statusLabels';

const PRIORITY_OPTIONS: { label: string; value: TestCasePriority }[] = [
  { label: TEST_CASE_PRIORITY_LABEL.low, value: 'low' },
  { label: TEST_CASE_PRIORITY_LABEL.medium, value: 'medium' },
  { label: TEST_CASE_PRIORITY_LABEL.high, value: 'high' },
  { label: TEST_CASE_PRIORITY_LABEL.critical, value: 'critical' },
];

type CreateTestRunDialogProps = {
  visible: boolean;
  mode: 'plan' | 'custom';
  onModeChange: (value: 'plan' | 'custom') => void;
  name: string;
  onNameChange: (value: string) => void;
  planId: string | null;
  onPlanIdChange: (value: string | null) => void;
  caseIds: string[];
  onCaseIdsChange: (value: string[]) => void;
  error: string | null;
  testPlans: TestPlan[];
  testCases: TestCaseWithDetails[];
  modules: Module[];
  tags: TagEntity[];
  testRoles: TestRole[];
  onHide: () => void;
  onCreate: () => void;
};

export function CreateTestRunDialog({
  visible,
  mode,
  onModeChange,
  name,
  onNameChange,
  planId,
  onPlanIdChange,
  caseIds,
  onCaseIdsChange,
  error,
  testPlans,
  testCases,
  modules,
  tags,
  testRoles,
  onHide,
  onCreate,
}: CreateTestRunDialogProps) {
  const nameRef = useRef<HTMLInputElement>(null);
  const [moduleFilter, setModuleFilter] = useState<string[]>([]);
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<TestCasePriority[]>([]);
  const [testRoleFilter, setTestRoleFilter] = useState<string[]>([]);

  useEffect(() => {
    if (error && nameRef.current) {
      nameRef.current.focus();
      nameRef.current.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    }
  }, [error]);

  function filterCases(modules: string[], tags: string[], priorities: TestCasePriority[], testRoles: string[]) {
    return testCases.filter((c) => {
      if (c.status !== 'active') return false;
      if (modules.length > 0 && !(c.moduleId && modules.includes(c.moduleId))) return false;
      if (tags.length > 0 && !c.tags.some((t) => tags.includes(t.id))) return false;
      if (priorities.length > 0 && !priorities.includes(c.priority)) return false;
      if (testRoles.length > 0 && !(c.targetRoleId && testRoles.includes(c.targetRoleId))) return false;
      return true;
    });
  }

  function applyFilters(modules: string[], tags: string[], priorities: TestCasePriority[], testRoles: string[]) {
    setModuleFilter(modules);
    setTagFilter(tags);
    setPriorityFilter(priorities);
    setTestRoleFilter(testRoles);
    const visible = new Set(filterCases(modules, tags, priorities, testRoles).map((c) => c.id));
    onCaseIdsChange(caseIds.filter((id) => visible.has(id)));
  }

  const filteredCases = filterCases(moduleFilter, tagFilter, priorityFilter, testRoleFilter);

  return (
    <Dialog header="Create Test Run" visible={visible} onHide={onHide} style={{ width: '38rem' }}>
      <div className="flex flex-column gap-2">
        <SelectButton
          value={mode}
          onChange={(e) => e.value && onModeChange(e.value)}
          options={[
            { label: 'From Test Plan', value: 'plan' },
            { label: 'Unplanned / Custom', value: 'custom' },
          ]}
        />
        <div className="flex flex-column gap-1">
          <FloatLabel className="ifta-field">
            <InputText id="run-name" ref={nameRef} value={name} onChange={(e) => onNameChange(e.target.value)} className={error ? 'p-invalid w-full' : 'w-full'} autoFocus />
            <label htmlFor="run-name" className={error ? 'p-error' : ''}>Name</label>
          </FloatLabel>
          {error && <small className="p-error">{error}</small>}
        </div>
        {mode === 'plan' ? (
          <div className="flex flex-column">
            <FloatLabel className="ifta-field">
              <Dropdown
                id="run-plan"
                value={planId}
                options={testPlans.map((p) => ({ label: `${p.code} — ${p.name}`, value: p.id }))}
                onChange={(e) => onPlanIdChange(e.value)}
                className="w-full"
                filter
              />
              <label htmlFor="run-plan">Test Plan</label>
            </FloatLabel>
          </div>
        ) : (
          <>
            <div className="grid p-1">
              <div className="col-12 md:col-3 p-1">
                <MultiSelect
                  value={moduleFilter}
                  options={modules.map((m) => ({ label: m.name, value: m.id }))}
                  onChange={(e) => applyFilters(e.value, tagFilter, priorityFilter, testRoleFilter)}
                  placeholder="All Modules"
                  className="w-full"
                  display="chip"
                  filter
                  virtualScrollerOptions={{ itemSize: 40 }}
                />
              </div>
              <div className="col-12 md:col-3 p-1">
                <MultiSelect
                  value={tagFilter}
                  options={tags.map((t) => ({ label: t.name, value: t.id }))}
                  onChange={(e) => applyFilters(moduleFilter, e.value, priorityFilter, testRoleFilter)}
                  placeholder="All Tags"
                  className="w-full"
                  display="chip"
                  filter
                  virtualScrollerOptions={{ itemSize: 40 }}
                />
              </div>
              <div className="col-12 md:col-3 p-1">
                <MultiSelect
                  value={priorityFilter}
                  options={PRIORITY_OPTIONS}
                  onChange={(e) => applyFilters(moduleFilter, tagFilter, e.value, testRoleFilter)}
                  placeholder="All Priorities"
                  className="w-full"
                  display="chip"
                  selectAllLabel="All"
                />
              </div>
              <div className="col-12 md:col-3 p-1">
                <MultiSelect
                  value={testRoleFilter}
                  options={testRoles.map((r) => ({ label: r.name, value: r.id }))}
                  onChange={(e) => applyFilters(moduleFilter, tagFilter, priorityFilter, e.value)}
                  placeholder="All Roles"
                  className="w-full"
                  display="chip"
                  filter
                />
              </div>
            </div>
            <div className="flex flex-column">
              <FloatLabel className="ifta-field">
                <MultiSelect
                  id="run-cases"
                  value={caseIds}
                  options={filteredCases.map((c) => ({ label: `${c.code} — ${c.title}`, value: c.id }))}
                  onChange={(e) => onCaseIdsChange(e.value)}
                  filter
                  display="chip"
                  className="w-full"
                />
                <label htmlFor="run-cases">Test Case ({filteredCases.length})</label>
              </FloatLabel>
            </div>
          </>
        )}
        <Button label="Create" size="small" onClick={onCreate} />
      </div>
    </Dialog>
  );
}
