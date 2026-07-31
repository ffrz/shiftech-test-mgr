import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card } from 'primereact/card';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { useAuthContext } from '../../hooks/useAuth';
import { useDashboard } from '../../hooks/useDashboard';
import { useProjectInvitations } from '../../hooks/useProjectInvitations';
import { profileRepository } from '../../repositories/profileRepository';
import { pathForActivityEntity, ACTIVITY_ENTITY_LABEL } from '../../helpers/activityRoutes';
import { describeSystemEvent } from '../../helpers/activityDescribe';
import { formatDateTime } from '../../helpers/dateFormatter';
import { toastHelper } from '../../helpers/toast';
import { PROJECT_MEMBER_ROLE_LABEL, ISSUE_PRIORITY_LABEL, ISSUE_PRIORITY_SEVERITY, ISSUE_STATUS_LABEL } from '../../helpers/statusLabels';
import type { ActivityEntityType } from '../../types/domain';

export function HomePage() {
  const navigate = useNavigate();
  const { profile } = useAuthContext();
  const { counts, recentProjects, continueWorking, myWorkIssues, myWorkLoading, recentActivity, activityLoading, loading } = useDashboard();
  const { invitations, accept, decline } = useProjectInvitations();

  const activityActorIds = useMemo(() => [...new Set(recentActivity.map((a) => a.actorId))], [recentActivity]);
  const { data: activityActors = [] } = useQuery({
    queryKey: ['profiles', 'byIds', ...activityActorIds.sort()],
    queryFn: () => profileRepository.findByIds(activityActorIds),
    enabled: activityActorIds.length > 0,
  });
  const activityActorById = useMemo(() => {
    const map = new Map<string, (typeof activityActors)[number]>();
    for (const p of activityActors) map.set(p.id, p);
    return map;
  }, [activityActors]);

  async function handleAccept(id: string, projectId?: string) {
    const ok = await accept(id, projectId);
    if (ok) toastHelper.success('Invitation accepted');
    else toastHelper.error('Failed to accept invitation', 'Please try again.');
  }

  async function handleDecline(id: string, projectId?: string) {
    const ok = await decline(id, projectId);
    if (ok) toastHelper.success('Invitation declined');
    else toastHelper.error('Failed to decline invitation', 'Please try again.');
  }

  return (
    <div>
      <ConfirmDialog />
      <Breadcrumb items={[{ label: 'Home' }]} />
      <h2 className="m-0 mt-2 mb-4">Welcome Back{profile?.displayName ? `, ${profile.displayName}` : ''}</h2>

      {invitations.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-2 flex align-items-center gap-2"><i className="pi pi-envelope text-primary" />Pending Invitations</h3>
          <div className="flex flex-column gap-2">
            {invitations.map((invite) => (
              <Card key={invite.id}>
                <div className="flex align-items-center justify-content-between gap-3 flex-wrap">
                  <div>
                    <div className="font-bold">{invite.project?.name ?? 'Unknown project'}</div>
                    <div className="text-sm text-color-secondary">
                      Invited as {PROJECT_MEMBER_ROLE_LABEL[invite.role]}
                      {invite.inviterDisplayName || invite.inviterUsername
                        ? ` by ${invite.inviterDisplayName ?? `@${invite.inviterUsername}`}`
                        : ''}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button label="Decline" text size="small" onClick={() => confirmDialog({
                      header: 'Decline Invitation',
                      message: `Are you sure you want to decline the invitation to ${invite.project?.name ?? 'this project'}?`,
                      icon: 'pi pi-question-circle',
                      acceptLabel: 'Decline',
                      rejectLabel: 'Cancel',
                      acceptClassName: 'p-button-danger',
                      accept: () => handleDecline(invite.id, invite.projectId),
                    })} />
                    <Button label="Accept" size="small" onClick={() => confirmDialog({
                      header: 'Accept Invitation',
                      message: `Are you sure you want to join ${invite.project?.name ?? 'this project'} as ${PROJECT_MEMBER_ROLE_LABEL[invite.role]}?`,
                      icon: 'pi pi-check-circle',
                      acceptLabel: 'Accept',
                      rejectLabel: 'Cancel',
                      accept: () => handleAccept(invite.id, invite.projectId),
                    })} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!myWorkLoading && myWorkIssues.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-2 flex align-items-center gap-2"><i className="pi pi-briefcase text-primary" />My Work</h3>
          <div className="flex flex-column gap-2">
            {myWorkIssues.map((issue) => (
              <Card
                key={issue.id}
                className="home-list-card cursor-pointer"
                pt={{ body: { className: 'py-3' } }}
                onClick={() => navigate(`/issues/${issue.id}`)}
              >
                <div className="flex align-items-center justify-content-between gap-3 flex-wrap">
                  <div className="flex align-items-center gap-3" style={{ minWidth: 0 }}>
                    <div className="stat-icon-badge stat-icon-red">
                      <i className="pi pi-exclamation-circle" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="font-bold white-space-nowrap overflow-hidden text-overflow-ellipsis">{issue.code} — {issue.title}</div>
                      <div className="text-sm text-color-secondary">{issue.projectName}</div>
                    </div>
                  </div>
                  <div className="flex align-items-center gap-2 flex-shrink-0">
                    <Tag value={ISSUE_PRIORITY_LABEL[issue.priority]} severity={ISSUE_PRIORITY_SEVERITY[issue.priority]} />
                    <Tag value={ISSUE_STATUS_LABEL[issue.status]} severity="secondary" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!loading && continueWorking.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-2 flex align-items-center gap-2"><i className="pi pi-history text-primary" />Continue Working</h3>
          <div className="flex flex-column gap-2">
            {continueWorking.map((item, i) => (
              <Card
                key={i}
                className="home-list-card cursor-pointer"
                pt={{ body: { className: 'py-3' } }}
                onClick={() => navigate(`/projects/${item.project.id}`)}
              >
                <div className="flex align-items-center justify-content-between gap-3 flex-wrap">
                  <div className="flex align-items-center gap-3">
                    <div className="stat-icon-badge stat-icon-orange">
                      <i className="pi pi-play" />
                    </div>
                    <div>
                      <div className="font-bold">{item.project.name}</div>
                      <div className="text-sm text-color-secondary">
                        {item.testPlan ? item.testPlan.name : item.testRunName}
                      </div>
                    </div>
                  </div>
                  <i className="pi pi-arrow-right text-color-secondary" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4">
        <h3 className="mb-2 flex align-items-center gap-2"><i className="pi pi-folder text-primary" />Recent Projects</h3>
        <Card pt={{ body: { className: 'p-2' }, content: { className: 'p-0' } }}>
          {recentProjects.length === 0 && !loading && (
            <div className="flex flex-column align-items-center gap-2 py-4 text-color-secondary">
              <i className="pi pi-folder-open text-3xl" />
              <span>No projects yet. Create one to get started.</span>
            </div>
          )}
          <div className="flex flex-column gap-1">
            {recentProjects.map((project) => (
              <div
                key={project.id}
                className="flex align-items-center justify-content-between gap-3 p-2 border-round cursor-pointer hover:surface-100"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <span className="flex align-items-center gap-2 font-medium">
                  <i className="pi pi-folder text-color-secondary" />
                  {project.name}
                </span>
                <i className="pi pi-chevron-right text-color-secondary" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mb-4">
        <h3 className="mb-2 flex align-items-center gap-2"><i className="pi pi-bolt text-primary" />Quick Actions</h3>
        <div className="flex gap-2 flex-wrap">
          <Button label="New Project" icon="pi pi-plus" onClick={() => navigate('/projects?create=true')} />
          <Button label="New Test Suite" icon="pi pi-plus" outlined onClick={() => navigate('/test-suites?create=true')} />
        </div>
      </div>

      <div className="mb-4">
        <h3 className="mb-2 flex align-items-center gap-2"><i className="pi pi-chart-bar text-primary" />Statistics</h3>
        <div className="grid">
          <div className="col-12 md:col-3">
            <Card className="stat-card" pt={{ body: { className: 'py-3' } }}>
              <div className="flex align-items-center gap-3">
                <div className="stat-icon-badge stat-icon-blue">
                  <i className="pi pi-folder" />
                </div>
                <div>
                  <div className="text-3xl font-bold line-height-1">{counts.projectCount}</div>
                  <div className="text-color-secondary text-sm mt-1">Projects</div>
                </div>
              </div>
            </Card>
          </div>
          <div className="col-12 md:col-3">
            <Card className="stat-card" pt={{ body: { className: 'py-3' } }}>
              <div className="flex align-items-center gap-3">
                <div className="stat-icon-badge stat-icon-purple">
                  <i className="pi pi-calendar" />
                </div>
                <div>
                  <div className="text-3xl font-bold line-height-1">{counts.testPlanCount}</div>
                  <div className="text-color-secondary text-sm mt-1">Test Plans</div>
                </div>
              </div>
            </Card>
          </div>
          <div className="col-12 md:col-3">
            <Card className="stat-card" pt={{ body: { className: 'py-3' } }}>
              <div className="flex align-items-center gap-3">
                <div className="stat-icon-badge stat-icon-teal">
                  <i className="pi pi-check-square" />
                </div>
                <div>
                  <div className="text-3xl font-bold line-height-1">{counts.testCaseCount}</div>
                  <div className="text-color-secondary text-sm mt-1">Test Cases</div>
                </div>
              </div>
            </Card>
          </div>
          <div className="col-12 md:col-3">
            <Card className="stat-card" pt={{ body: { className: 'py-3' } }}>
              <div className="flex align-items-center gap-3">
                <div className="stat-icon-badge stat-icon-red">
                  <i className="pi pi-exclamation-circle" />
                </div>
                <div>
                  <div className="text-3xl font-bold line-height-1">{counts.issueCount}</div>
                  <div className="text-color-secondary text-sm mt-1">Issues</div>
                </div>
              </div>
            </Card>
          </div>
          <div className="col-12 md:col-3">
            <Card className="stat-card" pt={{ body: { className: 'py-3' } }}>
              <div className="flex align-items-center gap-3">
                <div className="stat-icon-badge stat-icon-orange">
                  <i className="pi pi-flag" />
                </div>
                <div>
                  <div className="text-3xl font-bold line-height-1">{counts.openIssueCount}</div>
                  <div className="text-color-secondary text-sm mt-1">Open Issues</div>
                </div>
              </div>
            </Card>
          </div>
          <div className="col-12 md:col-3">
            <Card className="stat-card" pt={{ body: { className: 'py-3' } }}>
              <div className="flex align-items-center gap-3">
                <div className="stat-icon-badge stat-icon-indigo">
                  <i className="pi pi-copy" />
                </div>
                <div>
                  <div className="text-3xl font-bold line-height-1">{counts.testSuiteOwnedCount}</div>
                  <div className="text-color-secondary text-sm mt-1">Test Suites</div>
                </div>
              </div>
            </Card>
          </div>
          <div className="col-12 md:col-3">
            <Card className="stat-card" pt={{ body: { className: 'py-3' } }}>
              <div className="flex align-items-center gap-3">
                <div className="stat-icon-badge stat-icon-green">
                  <i className="pi pi-play-circle" />
                </div>
                <div>
                  <div className="text-3xl font-bold line-height-1">{counts.runningTestRunCount}</div>
                  <div className="text-color-secondary text-sm mt-1">Running Test Runs</div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {!activityLoading && recentActivity.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-2 flex align-items-center gap-2"><i className="pi pi-list text-primary" />Activity Feed</h3>
          <Card pt={{ body: { className: 'p-2' }, content: { className: 'p-0' } }}>
            <div className="flex flex-column gap-1">
              {recentActivity.map((entry) => {
                const actor = activityActorById.get(entry.actorId);
                const actorName = actor?.displayName ?? actor?.username ?? 'Unknown';
                const entityType = entry.entityType as ActivityEntityType;
                return (
                  <div
                    key={entry.id}
                    className="flex align-items-start gap-2 p-2 border-round cursor-pointer hover:surface-100"
                    onClick={() => navigate(pathForActivityEntity(entry.entityType, entry.entityId))}
                  >
                    <i className={`pi ${entry.eventType === 'comment' ? 'pi-comment' : 'pi-sync'} text-color-secondary mt-1`} style={{ fontSize: '0.9rem' }} />
                    <div className="flex-1" style={{ minWidth: 0 }}>
                      <div className="text-sm">
                        <span className="font-medium">{actorName}</span>{' '}
                        {entry.eventType === 'comment' ? 'commented on' : describeSystemEvent(entry)}{' '}
                        <span className="text-color-secondary">{ACTIVITY_ENTITY_LABEL[entityType] ?? entry.entityType}</span>
                      </div>
                      <div className="text-xs text-color-secondary">{formatDateTime(entry.createdAt)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
