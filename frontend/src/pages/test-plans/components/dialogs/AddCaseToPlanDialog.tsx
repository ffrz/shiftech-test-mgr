import { useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { MultiSelect } from 'primereact/multiselect';
import { Button } from 'primereact/button';
import { FloatLabel } from 'primereact/floatlabel';
import type { Module, Tag as TagEntity, TestCasePriority, TestCaseWithDetails, TestRole } from '../../../../types/domain';
import { TEST_CASE_PRIORITY_LABEL } from '../../../../helpers/statusLabels';

const PRIORITY_OPTIONS: { label: string; value: TestCasePriority }[] = [
  { label: TEST_CASE_PRIORITY_LABEL.low, value: 'low' },
  { label: TEST_CASE_PRIORITY_LABEL.medium, value: 'medium' },
  { label: TEST_CASE_PRIORITY_LABEL.high, value: 'high' },
  { label: TEST_CASE_PRIORITY_LABEL.critical, value: 'critical' },
];

type AddCaseToPlanDialogProps = {
  visible: boolean;
  onHide: () => void;
  availableCases: TestCaseWithDetails[];
  modules: Module[];
  tags: TagEntity[];
  testRoles: TestRole[];
  selectedCaseIds: string[];
  onSelectedCaseIdsChange: (value: string[]) => void;
  onAdd: () => void;
};

export function AddCaseToPlanDialog({
  visible,
  onHide,
  availableCases,
  modules,
  tags,
  testRoles,
  selectedCaseIds,
  onSelectedCaseIdsChange,
  onAdd,
}: AddCaseToPlanDialogProps) {
  const [moduleFilter, setModuleFilter] = useState<string[]>([]);
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<TestCasePriority[]>([]);
  const [testRoleFilter, setTestRoleFilter] = useState<string[]>([]);

  function filterCases(modules: string[], tags: string[], priorities: TestCasePriority[], testRoles: string[]) {
    return availableCases.filter((c) => {
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
    onSelectedCaseIdsChange(selectedCaseIds.filter((id) => visible.has(id)));
  }

  const filteredCases = filterCases(moduleFilter, tagFilter, priorityFilter, testRoleFilter);

  return (
    <Dialog header="Add Test Case to Plan" visible={visible} onHide={onHide} style={{ width: '38rem' }}>
      <div className="flex flex-column gap-2">
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
        <FloatLabel className="ifta-field">
          <MultiSelect
            id="add-case-to-plan"
            value={selectedCaseIds}
            options={filteredCases.map((c) => ({ label: `${c.code} — ${c.title}`, value: c.id }))}
            onChange={(e) => onSelectedCaseIdsChange(e.value)}
            filter
            display="chip"
            className="w-full"
          />
          <label htmlFor="add-case-to-plan">Test Case ({filteredCases.length})</label>
        </FloatLabel>
        <Button label="Add" size="small" onClick={onAdd} disabled={selectedCaseIds.length === 0} />
      </div>
    </Dialog>
  );
}
