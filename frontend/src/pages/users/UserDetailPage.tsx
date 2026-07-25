import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from 'primereact/card';
import { Avatar } from 'primereact/avatar';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { userService } from '../../services/userService';
import { profileService } from '../../services/profileService';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import type { User, Profile } from '../../types/domain';
import { formatDateTime } from '../../helpers/dateFormatter';
import { USER_ROLE_LABEL, USER_ROLE_SEVERITY } from '../../helpers/statusLabels';

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([userService.getById(id), profileService.getById(id)]).then(([u, p]) => {
      setUser(u);
      setProfile(p);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <p>Loading...</p>;
  if (!user) return <p>User not found.</p>;

  const displayName = profile?.displayName ?? profile?.username ?? user.email;

  return (
    <div>
      <Breadcrumb
        items={[
          { label: 'Users', path: '/users' },
          { label: displayName },
        ]}
      />

      <Button label="Back" icon="pi pi-arrow-left" text onClick={() => navigate('/users')} className="mb-3" />

      <Card>
        <div className="flex align-items-center gap-3 mb-4">
          <Avatar image={profile?.avatarUrl ?? undefined} icon={profile?.avatarUrl ? undefined : 'pi pi-user'} shape="circle" size="xlarge" />
          <div>
            <h2 className="m-0">{displayName}</h2>
            <p className="m-0 text-color-secondary">{user.email}</p>
          </div>
          <div className="flex-1" />
          <Tag value={USER_ROLE_LABEL[user.role]} severity={USER_ROLE_SEVERITY[user.role]} />
        </div>

        <div className="grid">
          <div className="col-12 md:col-6">
            <label className="block text-color-secondary text-sm mb-1">Registered</label>
            <p className="mt-0">{formatDateTime(user.createdAt)}</p>
          </div>
          <div className="col-12 md:col-6">
            <label className="block text-color-secondary text-sm mb-1">Last Updated</label>
            <p className="mt-0">{formatDateTime(user.updatedAt)}</p>
          </div>
          <div className="col-12 md:col-6">
            <label className="block text-color-secondary text-sm mb-1">User ID</label>
            <p className="mt-0 text-sm font-mono">{user.id}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
