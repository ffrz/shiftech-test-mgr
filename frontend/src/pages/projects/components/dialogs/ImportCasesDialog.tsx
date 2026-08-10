import { useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { TabView, TabPanel } from 'primereact/tabview';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { Button } from 'primereact/button';
import { FloatLabel } from 'primereact/floatlabel';
import { Tag } from 'primereact/tag';
import { useQuery } from '@tanstack/react-query';
import { useAuthContext } from '../../../../hooks/useAuth';
import { testSuiteService } from '../../../../services/testSuiteService';
import { projectRepository } from '../../../../repositories/projectRepository';
import { testCaseRepository } from '../../../../repositories/testCaseRepository';
import { queryKeys } from '../../../../hooks/queryKeys';
import { UsernamePicker } from '../../../../components/ui/UsernamePicker';
import type { Profile, TestSuiteItem } from '../../../../types/domain';

type CaseOption = { id: string; label: string };

type ImportSource =
  | { kind: 'suite'; suiteId: string }
  | { kind: 'project'; projectId: string };

type ImportCasesDialogProps = {
  visible: boolean;
  onHide: () => void;
  loading: boolean;
  // Called with the picked case/item ids and where they came from — caller decides how to
  // clone them (into a project's test_cases, or into a suite's items).
  onImport: (source: ImportSource, ids: string[]) => void;
  // Exclude the import target itself from its own source list — a project can't import from
  // itself, a suite can't import from itself.
  excludeProjectId?: string;
  excludeSuiteId?: string;
};

export function ImportCasesDialog({ visible, onHide, loading, onImport, excludeProjectId, excludeSuiteId }: ImportCasesDialogProps) {
  const { user } = useAuthContext();
  const [activeTab, setActiveTab] = useState(0);

  // --- Tab 1: My Suites ---
  const [mySuiteId, setMySuiteId] = useState<string | null>(null);
  const [mySuiteItems, setMySuiteItems] = useState<TestSuiteItem[]>([]);
  const [mySuiteItemIds, setMySuiteItemIds] = useState<string[]>([]);

  const { data: mySuitesRaw = [] } = useQuery({
    queryKey: [...queryKeys.testSuites(), 'mine', user?.id],
    queryFn: () => testSuiteService.listByOwner(user!.id),
    enabled: visible && !!user,
  });
  const mySuites = mySuitesRaw.filter((s) => s.id !== excludeSuiteId);

  async function selectMySuite(id: string | null) {
    setMySuiteId(id);
    setMySuiteItemIds([]);
    setMySuiteItems(id ? await testSuiteService.listItems(id) : []);
  }

  // --- Tab 2: Browse Public Suites ---
  // Author must be picked first (via username typeahead) before any suite list loads —
  // avoids fetching every public suite in the system up front.
  const [publicAuthor, setPublicAuthor] = useState<Profile | null>(null);
  const [publicSuiteId, setPublicSuiteId] = useState<string | null>(null);
  const [publicSuiteItems, setPublicSuiteItems] = useState<TestSuiteItem[]>([]);
  const [publicSuiteItemIds, setPublicSuiteItemIds] = useState<string[]>([]);

  const { data: authorSuitesRaw = [] } = useQuery({
    queryKey: [...queryKeys.testSuites(), 'public', publicAuthor?.id],
    queryFn: () => testSuiteService.listByOwner(publicAuthor!.id, ['public']),
    enabled: visible && !!publicAuthor,
  });
  const authorSuites = authorSuitesRaw.filter((s) => s.id !== excludeSuiteId);

  function selectPublicAuthor(profile: Profile | null) {
    setPublicAuthor(profile);
    setPublicSuiteId(null);
    setPublicSuiteItems([]);
    setPublicSuiteItemIds([]);
  }

  async function selectPublicSuite(id: string | null) {
    setPublicSuiteId(id);
    setPublicSuiteItemIds([]);
    setPublicSuiteItems(id ? await testSuiteService.listItems(id) : []);
  }

  // --- Tab 3: From Another Project ---
  const [sourceProjectId, setSourceProjectId] = useState<string | null>(null);
  const [projectCases, setProjectCases] = useState<CaseOption[]>([]);
  const [projectCaseIds, setProjectCaseIds] = useState<string[]>([]);

  const { data: myProjectsRaw = [] } = useQuery({
    queryKey: ['projects', 'mine', user?.id],
    queryFn: () => projectRepository.findByOwner(user!.id),
    enabled: visible && activeTab === 2 && !!user,
  });
  const myProjects = myProjectsRaw.filter((p) => p.id !== excludeProjectId);

  async function selectSourceProject(id: string | null) {
    setSourceProjectId(id);
    setProjectCaseIds([]);
    if (!id) { setProjectCases([]); return; }
    const cases = await testCaseRepository.findAllByProject(id);
    setProjectCases(cases.filter((c) => c.status === 'active').map((c) => ({ id: c.id, label: c.title })));
  }

  function reset() {
    setMySuiteId(null); setMySuiteItems([]); setMySuiteItemIds([]);
    setPublicAuthor(null); setPublicSuiteId(null); setPublicSuiteItems([]); setPublicSuiteItemIds([]);
    setSourceProjectId(null); setProjectCases([]); setProjectCaseIds([]);
    setActiveTab(0);
  }

  function handleHide() {
    reset();
    onHide();
  }

  function handleImport() {
    if (activeTab === 0 && mySuiteId && mySuiteItemIds.length > 0) {
      onImport({ kind: 'suite', suiteId: mySuiteId }, mySuiteItemIds);
    } else if (activeTab === 1 && publicSuiteId && publicSuiteItemIds.length > 0) {
      onImport({ kind: 'suite', suiteId: publicSuiteId }, publicSuiteItemIds);
    } else if (activeTab === 2 && sourceProjectId && projectCaseIds.length > 0) {
      onImport({ kind: 'project', projectId: sourceProjectId }, projectCaseIds);
    }
  }

  const activeCount =
    activeTab === 0 ? mySuiteItemIds.length : activeTab === 1 ? publicSuiteItemIds.length : projectCaseIds.length;

  return (
    <Dialog header="Import Test Cases" visible={visible} onHide={handleHide} style={{ width: '38rem' }}>
      <TabView scrollable activeIndex={activeTab} onTabChange={(e) => setActiveTab(e.index)}>
        <TabPanel header="My Suites">
          <div className="flex flex-column gap-2 pt-2">
            <FloatLabel className="ifta-field">
              <Dropdown
                id="import-my-suite"
                value={mySuiteId}
                options={mySuites.map((s) => ({ label: s.name, value: s.id }))}
                onChange={(e) => selectMySuite(e.value)}
                className="w-full"
                filter
                emptyMessage="You don't own any suites yet"
              />
              <label htmlFor="import-my-suite">Suite</label>
            </FloatLabel>
            {mySuiteId && (
              <FloatLabel className="ifta-field">
                <MultiSelect
                  id="import-my-suite-items"
                  value={mySuiteItemIds}
                  options={mySuiteItems.map((i) => ({ label: i.title, value: i.id }))}
                  onChange={(e) => setMySuiteItemIds(e.value ?? [])}
                  filter
                  display="chip"
                  className="w-full"
                />
                <label htmlFor="import-my-suite-items">Item</label>
              </FloatLabel>
            )}
          </div>
        </TabPanel>

        <TabPanel header="Browse Public">
          <div className="flex flex-column gap-2 pt-2">
            <FloatLabel className="ifta-field">
              <UsernamePicker
                id="import-public-author"
                value={publicAuthor}
                onChange={selectPublicAuthor}
              />
              <label htmlFor="import-public-author">Author</label>
            </FloatLabel>
            {publicAuthor && (
              <FloatLabel className="ifta-field">
                <Dropdown
                  id="import-public-suite"
                  value={publicSuiteId}
                  options={authorSuites.map((s) => ({ label: s.name, value: s.id }))}
                  onChange={(e) => selectPublicSuite(e.value)}
                  className="w-full"
                  filter
                  emptyMessage="This user has no public suites"
                />
                <label htmlFor="import-public-suite">Public Suite</label>
              </FloatLabel>
            )}
            {publicSuiteId && (
              <FloatLabel className="ifta-field">
                <MultiSelect
                  id="import-public-suite-items"
                  value={publicSuiteItemIds}
                  options={publicSuiteItems.map((i) => ({ label: i.title, value: i.id }))}
                  onChange={(e) => setPublicSuiteItemIds(e.value ?? [])}
                  filter
                  display="chip"
                  className="w-full"
                />
                <label htmlFor="import-public-suite-items">Item</label>
              </FloatLabel>
            )}
          </div>
        </TabPanel>

        <TabPanel header="From Project">
          <div className="flex flex-column gap-2 pt-2">
            <FloatLabel className="ifta-field">
              <Dropdown
                id="import-source-project"
                value={sourceProjectId}
                options={myProjects.map((p) => ({ label: p.name, value: p.id }))}
                onChange={(e) => selectSourceProject(e.value)}
                className="w-full"
                filter
                emptyMessage="No projects found"
              />
              <label htmlFor="import-source-project">Project</label>
            </FloatLabel>
            {sourceProjectId && (
              <FloatLabel className="ifta-field">
                <MultiSelect
                  id="import-project-cases"
                  value={projectCaseIds}
                  options={projectCases.map((c) => ({ label: c.label, value: c.id }))}
                  onChange={(e) => setProjectCaseIds(e.value ?? [])}
                  filter
                  display="chip"
                  className="w-full"
                />
                <label htmlFor="import-project-cases">Test Case</label>
              </FloatLabel>
            )}
          </div>
        </TabPanel>
      </TabView>

      <div className="flex align-items-center justify-content-between mt-3">
        {activeCount > 0 && <Tag value={`${activeCount} selected`} severity="info" />}
        <Button
          label={`Import ${activeCount > 0 ? activeCount : ''} Test Case${activeCount === 1 ? '' : 's'}`}
          size="small"
          loading={loading}
          disabled={activeCount === 0}
          onClick={handleImport}
          className="ml-auto"
        />
      </div>
    </Dialog>
  );
}
