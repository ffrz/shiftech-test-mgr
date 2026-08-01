import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from 'primereact/card';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { testSuiteService } from '../../services/testSuiteService';
import { queryKeys } from '../../hooks/queryKeys';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { TestSuiteItemDetailPageSkeleton } from './TestSuiteItemDetailPageSkeleton';
import { TestSuiteItemDialog } from '../../components/dialogs/TestSuiteItemDialog';
import { TEST_CASE_PRIORITY_LABEL, TEST_CASE_PRIORITY_SEVERITY } from '../../helpers/statusLabels';
import { formatDateTime } from '../../helpers/dateFormatter';
import { useAuthContext } from '../../hooks/useAuth';

export function TestSuiteItemDetailPage() {
  const { suiteId, itemId } = useParams<{ suiteId: string; itemId: string }>();
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const { data: suite = null } = useQuery({
    queryKey: queryKeys.testSuite(suiteId ?? ''),
    queryFn: () => testSuiteService.getSuite(suiteId!),
    enabled: !!suiteId,
  });

  const { data: item, isLoading: loading } = useQuery({
    queryKey: queryKeys.testSuiteItem(itemId ?? ''),
    queryFn: () => testSuiteService.getItemById(itemId!),
    enabled: !!itemId,
  });

  const detailedSteps = useMemo(() => item?.detailedSteps ?? [], [item]);

  if (loading || !item) {
    if (loading) return <TestSuiteItemDetailPageSkeleton />;
    return (
      <div>
        <Breadcrumb
          items={[
            { label: 'Test Suite', path: '/test-suites' },
            ...(suite ? [{ label: suite.name, path: `/test-suites/${suite.id}` }] : []),
            { label: 'Item not found' },
          ]}
        />
        <p>Item not found.</p>
      </div>
    );
  }

  return (
    <div>
      <Breadcrumb
        items={[
          { label: 'Test Suite', path: '/test-suites' },
          ...(suite ? [{ label: suite.name, path: `/test-suites/${suite.id}` }] : []),
          { label: item.title },
        ]}
      />

      <div className="detail-content-col mx-auto">
        <Card className="mb-3">
          <div className="flex align-items-start justify-content-between gap-2">
            <h2 className="m-0">{item.title}</h2>
            {suite?.ownerId === user?.id && (
              <div className="flex header-actions gap-1">
                <Button icon="pi pi-pencil" rounded size="small" text severity="secondary" onClick={() => setEditOpen(true)} />
              </div>
            )}
          </div>

          <div className="flex align-items-center gap-2 mt-3">
            <Tag value={TEST_CASE_PRIORITY_LABEL[item.priority]} severity={TEST_CASE_PRIORITY_SEVERITY[item.priority]} />
            <Tag value={item.stepType === 'detailed' ? 'Detailed' : 'Simple'} severity="secondary" />
            {item.targetRole && <Tag value={item.targetRole} severity="secondary" />}
          </div>

          <div className="flex flex-wrap column-gap-4 row-gap-1 mt-3 mb-3 text-xs">
            <span className="text-color-secondary">
              <i className="pi pi-calendar-plus mr-1" style={{ fontSize: '0.75rem' }} />
              Created <span className="text-color">{formatDateTime(item.createdAt)}</span>
            </span>
            <span className="text-color-secondary">
              <i className="pi pi-clock mr-1" style={{ fontSize: '0.75rem' }} />
              Updated <span className="text-color">{formatDateTime(item.updatedAt)}</span>
            </span>
          </div>

          <div className="project-stat-grid project-stat-grid-fixed2">
            <div className="project-stat-tile">
              <i className="pi pi-folder text-primary" />
              <div className="project-stat-tile-body">
                <span className="project-stat-value-text">{item.moduleName ?? '-'}</span>
                <span className="project-stat-label">Module</span>
              </div>
            </div>
            <div className="project-stat-tile">
              <i className="pi pi-tags text-primary" />
              <div className="project-stat-tile-body">
                <span className="project-stat-value-text">{item.tagNames.length > 0 ? item.tagNames.join(', ') : '-'}</span>
                <span className="project-stat-label">Tags</span>
              </div>
            </div>
          </div>
        </Card>

        {item.objective && (
          <Card title="Objective" className="mb-3 detail-content-card">
            <p className="m-0">{item.objective}</p>
          </Card>
        )}

        {item.preconditions && (
          <Card title="Preconditions" className="mb-3 detail-content-card">
            <p className="m-0" style={{ whiteSpace: 'pre-wrap' }}>{item.preconditions}</p>
          </Card>
        )}

        {item.stepType === 'detailed' ? (
          <Card title="Test Steps" className="mb-3 detail-content-card">
            <ol className="m-0 pl-3 flex flex-column gap-2">
              {detailedSteps.map((step) => (
                <li key={step.id}>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{step.action}</div>
                  {step.expectedResult && (
                    <div className="text-color-secondary text-sm mt-1" style={{ whiteSpace: 'pre-wrap' }}>
                      Expected: {step.expectedResult}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </Card>
        ) : (
          <>
            <Card title="Test Steps" className="mb-3 detail-content-card">
              <p className="m-0" style={{ whiteSpace: 'pre-wrap' }}>{item.steps}</p>
            </Card>

            <Card title="Expected Result" className="mb-3 detail-content-card">
              <p className="m-0" style={{ whiteSpace: 'pre-wrap' }}>{item.expectedResult}</p>
            </Card>
          </>
        )}

        {item.notes && (
          <Card title="Notes" className="mb-3 detail-content-card">
            <p className="m-0" style={{ whiteSpace: 'pre-wrap' }}>{item.notes}</p>
          </Card>
        )}
      </div>

      <TestSuiteItemDialog
        visible={editOpen}
        mode="edit"
        item={item}
        suiteId={suiteId ?? ''}
        onHide={() => setEditOpen(false)}
        onSaved={() => {
          setEditOpen(false);
          queryClient.invalidateQueries({ queryKey: queryKeys.testSuiteItem(itemId ?? '') });
          queryClient.invalidateQueries({ queryKey: ['testSuiteItem'] });
        }}
      />
    </div>
  );
}
