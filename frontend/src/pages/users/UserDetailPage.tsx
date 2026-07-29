import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from 'primereact/card';
import { Tag } from 'primereact/tag';
import { userService } from '../../services/userService';
import { profileService } from '../../services/profileService';
import { projectService } from '../../services/projectService';
import { testSuiteService } from '../../services/testSuiteService';
import { ProfileView } from '../../components/profile/ProfileView';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import type { User, Profile, Project, TestSuite } from '../../types/domain';
import { formatDateTime } from '../../helpers/dateFormatter';
import { USER_ROLE_LABEL, USER_ROLE_SEVERITY } from '../../helpers/statusLabels';

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [suites, setSuites] = useState<TestSuite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([userService.getById(id), profileService.getById(id)]).then(([u, p]) => {
      setUser(u);
      setProfile(p);
      if (!p) { setLoading(false); return; }

      Promise.all([
        projectService.listByOwner(p.id),
        testSuiteService.listByOwner(p.id),
      ]).then(([proj, suites]) => {
        setProjects(proj);
        setSuites(suites);
        setLoading(false);
      });
    });
  }, [id]);

  if (loading) return <p>Loading...</p>;
  if (!user) return <p>User not found.</p>;
  if (!profile) return <p>Profile not found.</p>;

  const displayName = profile.displayName ?? profile.username;

  const adminOverlay = (
    <div className="flex align-items-center gap-2">
      <div className="text-right">
        <div className="text-sm text-color-secondary">{user.email}</div>
        <Tag value={USER_ROLE_LABEL[user.role]} severity={USER_ROLE_SEVERITY[user.role]} />
      </div>
    </div>
  );

  return (
    <div>
      <Breadcrumb
        items={[
          { label: 'Users', path: '/users' },
          { label: displayName },
        ]}
      />

      <ProfileView profile={profile} projects={projects} suites={suites} adminOverlay={adminOverlay} />

      <Card className="mt-3">
        <h3 className="m-0 mb-3">Account Info (Admin Only)</h3>
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
