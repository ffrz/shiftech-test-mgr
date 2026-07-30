import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import type { Project, ProjectVisibility } from '../../../../types/domain';
import { PROJECT_STATUS_LABEL, PROJECT_STATUS_SEVERITY } from '../../../../helpers/statusLabels';

type DangerZoneTabProps = {
  project: Project;
  visibility: ProjectVisibility;
  onChangeVisibility: (value: ProjectVisibility) => void;
  onToggleActive: () => void;
  canArchiveProject: boolean;
  onArchive: () => void;
  canDeleteProject: boolean;
  onDeletePermanently: () => void;
};

const SECTION_CLASS = 'flex flex-column gap-3 p-3 border-round-md';
const SECTION_STYLE = { border: '1px solid var(--surface-200)', backgroundColor: 'var(--surface-50)' };

export function DangerZoneTab({
  project,
  onToggleActive,
  canArchiveProject,
  onArchive,
  canDeleteProject,
  onDeletePermanently,
}: DangerZoneTabProps) {
  return (
    <div className="flex flex-column gap-3" style={{ maxWidth: '40rem' }}>
      <div className={SECTION_CLASS} style={SECTION_STYLE}>
        <div>
          <div className="font-medium text-color">Project Status</div>
          <div className="text-color-secondary text-sm mt-1">
            Current status: <Tag value={PROJECT_STATUS_LABEL[project.status]} severity={PROJECT_STATUS_SEVERITY[project.status]} />.
            {project.status === 'active' ? ' Deactivate to hide from active lists.' : ' Activate to make it visible again.'}
          </div>
        </div>
        <Button
          label={project.status === 'active' ? 'Set Inactive' : 'Set Active'}
          icon={project.status === 'active' ? 'pi pi-pause' : 'pi pi-play'}
          severity="warning"
          outlined
          className="w-full md:w-15rem"
          onClick={onToggleActive}
        />
      </div>
      {canArchiveProject && project.status !== 'archived' && (
        <div className={SECTION_CLASS} style={SECTION_STYLE}>
          <div>
            <div className="font-medium text-color">Archive Project</div>
            <div className="text-color-secondary text-sm mt-1">
              Archived projects do not appear in the active list.
            </div>
          </div>
          <Button
            label="Archive"
            icon="pi pi-inbox"
            severity="warning"
            outlined
            className="w-full md:w-15rem"
            onClick={onArchive}
          />
        </div>
      )}
      {canDeleteProject && (
        <div className={SECTION_CLASS} style={SECTION_STYLE}>
          <div>
            <div className="font-medium text-color">Permanently Delete</div>
            <div className="text-color-secondary text-sm mt-1">
              Deletes the project along with all its test plans and test cases. This action cannot be undone.
            </div>
          </div>
          <Button
            label="Permanently Delete"
            icon="pi pi-trash"
            severity="danger"
            outlined
            className="w-full md:w-15rem"
            onClick={onDeletePermanently}
          />
        </div>
      )}
    </div>
  );
}
