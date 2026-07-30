import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { FloatLabel } from 'primereact/floatlabel';
import { UsernamePicker } from '../../../../components/ui/UsernamePicker';
import type { Profile, ProjectMemberRole } from '../../../../types/domain';
import { MEMBER_ROLE_OPTIONS } from '../tabs/MembersTab';

type InviteMemberDialogProps = {
  visible: boolean;
  profile: Profile | null;
  onProfileChange: (value: Profile | null) => void;
  role: ProjectMemberRole;
  onRoleChange: (value: ProjectMemberRole) => void;
  excludeIds: string[];
  error: string | null;
  onHide: () => void;
  onInvite: () => void;
};

export function InviteMemberDialog({
  visible,
  profile,
  onProfileChange,
  role,
  onRoleChange,
  excludeIds,
  error,
  onHide,
  onInvite,
}: InviteMemberDialogProps) {
  return (
    <Dialog
      header="Invite Member"
      visible={visible}
      onHide={onHide}
      style={{ width: '25rem' }}
    >
      <div className="flex flex-column gap-2">
        {error && <small className="p-error">{error}</small>}
        <div className="flex flex-column">
          <FloatLabel className="ifta-field">
            <UsernamePicker id="member-user" value={profile} onChange={onProfileChange} excludeIds={excludeIds} />
            <label htmlFor="member-user">Username</label>
          </FloatLabel>
        </div>
        <div className="flex flex-column">
          <FloatLabel className="ifta-field">
            <Dropdown
              id="member-role"
              value={role}
              options={MEMBER_ROLE_OPTIONS}
              onChange={(e) => onRoleChange(e.value)}
              className="w-full"
            />
            <label htmlFor="member-role">Role</label>
          </FloatLabel>
        </div>
        <Button label="Send Invite" size="small" onClick={onInvite} />
      </div>
    </Dialog>
  );
}
