import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { useAuthContext } from '../../hooks/useAuth';
import { useDashboard } from '../../hooks/useDashboard';
import { useProjectInvitations } from '../../hooks/useProjectInvitations';
import { PROJECT_MEMBER_ROLE_LABEL } from '../../helpers/statusLabels';

export function HomePage() {
  const navigate = useNavigate();
  const toast = useRef<Toast>(null);
  const { profile } = useAuthContext();
  const { counts, recentProjects, continueWorking, loading } = useDashboard();
  const { invitations, accept, decline } = useProjectInvitations();

  async function handleAccept(id: string, projectId?: string) {
    const ok = await accept(id, projectId);
    toast.current?.show(
      ok
        ? { severity: 'success', summary: 'Invitation accepted' }
        : { severity: 'error', summary: 'Failed to accept invitation', detail: 'Please try again.' },
    );
  }

  async function handleDecline(id: string, projectId?: string) {
    const ok = await decline(id, projectId);
    toast.current?.show(
      ok
        ? { severity: 'success', summary: 'Invitation declined' }
        : { severity: 'error', summary: 'Failed to decline invitation', detail: 'Please try again.' },
    );
  }

  return (
    <div>
      <Toast ref={toast} />
      <ConfirmDialog />
      <Breadcrumb items={[{ label: 'Home' }]} />
      <h2 className="m-0 mb-4">Welcome Back{profile?.displayName ? `, ${profile.displayName}` : ''}</h2>

      {invitations.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-2">Pending Invitations</h3>
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

      {!loading && continueWorking.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-2">Continue Working</h3>
          <div className="flex flex-column gap-2">
            {continueWorking.map((item, i) => (
              <Card key={i}>
                <div className="flex align-items-center justify-content-between gap-3 flex-wrap">
                  <div>
                    <div className="font-bold">{item.project.name}</div>
                    <div className="text-sm text-color-secondary">
                      {item.testPlan ? item.testPlan.name : item.testRunName}
                    </div>
                  </div>
                  <Button
                    label="Open"
                    icon="pi pi-arrow-right"
                    iconPos="right"
                    text
                    size="small"
                    onClick={() => navigate(`/projects/${item.project.id}`)}
                  />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4">
        <h3 className="mb-2">Recent Projects</h3>
        <Card pt={{ body: { className: 'p-2' }, content: { className: 'p-0' } }}>
          {recentProjects.length === 0 && !loading && (
            <span className="text-color-secondary">No projects yet.</span>
          )}
          <div className="flex flex-column gap-1">
            {recentProjects.map((project) => (
              <div
                key={project.id}
                className="flex align-items-center justify-content-between gap-3 p-1 border-round cursor-pointer hover:surface-100"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <span className="font-medium">{project.name}</span>
                <i className="pi pi-chevron-right text-color-secondary" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mb-4">
        <h3 className="mb-2">Quick Actions</h3>
        <div className="flex gap-2 flex-wrap">
          <Button label="New Project" icon="pi pi-plus" onClick={() => navigate('/projects')} />
          <Button label="New Test Suite" icon="pi pi-plus" outlined onClick={() => navigate('/test-suites')} />
        </div>
      </div>

      <div>
        <h3 className="mb-2">Statistics</h3>
        <div className="grid">
          <div className="col-12 md:col-4">
            <Card className="text-center">
              <div className="text-3xl font-bold">{counts.projectCount}</div>
              <div className="text-color-secondary">Projects</div>
            </Card>
          </div>
          <div className="col-12 md:col-4">
            <Card className="text-center">
              <div className="text-3xl font-bold">{counts.testPlanCount}</div>
              <div className="text-color-secondary">Test Plans</div>
            </Card>
          </div>
          <div className="col-12 md:col-4">
            <Card className="text-center">
              <div className="text-3xl font-bold">{counts.testCaseCount}</div>
              <div className="text-color-secondary">Test Cases</div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
