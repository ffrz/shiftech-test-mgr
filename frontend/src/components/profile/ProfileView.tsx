import { Card } from 'primereact/card';
import { Avatar } from 'primereact/avatar';
import { Tag } from 'primereact/tag';
import { Link } from 'react-router-dom';
import { formatDateTime } from '../../helpers/dateFormatter';
import {
  PROJECT_VISIBILITY_LABEL,
  PROJECT_VISIBILITY_SEVERITY,
  TEST_SUITE_VISIBILITY_LABEL,
  TEST_SUITE_VISIBILITY_SEVERITY,
} from '../../helpers/statusLabels';
import type { Profile, Project, TestSuite } from '../../types/domain';

interface ProfileViewProps {
  profile: Profile;
  projects: Project[];
  suites: TestSuite[];
  isSpying?: boolean;
  adminOverlay?: React.ReactNode;
}

export function ProfileView({ profile, projects, suites, isSpying, adminOverlay }: ProfileViewProps) {
  const displayName = profile.displayName ?? profile.username;

  return (
    <div className="mx-auto" style={{ maxWidth: 640 }}>
      <Card>
        <div className="flex align-items-center gap-3 mb-4">
          <Avatar image={profile.avatarUrl ?? undefined} icon={profile.avatarUrl ? undefined : 'pi pi-user'} shape="circle" size="xlarge" />
          <div className="flex-1">
            <div className="flex align-items-center gap-2">
              <h2 className="m-0">{displayName}</h2>
              {isSpying && <Tag value="Spy" severity="warning" />}
            </div>
            <p className="m-0 text-color-secondary">@{profile.username}</p>
            {profile.bio && <p className="m-0 mt-2">{profile.bio}</p>}
          </div>
          {adminOverlay}
        </div>

        <div className="grid">
          <div className="col-12 md:col-6">
            <label className="block text-color-secondary text-sm mb-1">Member Since</label>
            <p className="mt-0">{profile.createdAt ? formatDateTime(profile.createdAt) : '-'}</p>
          </div>
        </div>
      </Card>

      <Card className="mt-3">
        <h3 className="m-0 mb-3">Projects</h3>
        {projects.length === 0 ? (
          <p className="text-color-secondary m-0">No projects.</p>
        ) : (
          <div className="flex flex-column gap-2">
            {projects.map((p) => (
              <div key={p.id} className="flex align-items-center gap-2">
                {p.visibility === 'public' ? (
                  <Link to={`/projects/${p.id}`} className="flex-1 no-underline text-color hover:text-primary">{p.name}</Link>
                ) : (
                  <span className="flex-1">{p.name}</span>
                )}
                <Tag value={PROJECT_VISIBILITY_LABEL[p.visibility]} severity={PROJECT_VISIBILITY_SEVERITY[p.visibility]} />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="mt-3">
        <h3 className="m-0 mb-3">Test Suites</h3>
        {suites.length === 0 ? (
          <p className="text-color-secondary m-0">No test suites.</p>
        ) : (
          <div className="flex flex-column gap-2">
            {suites.map((s) => (
              <div key={s.id} className="flex align-items-center gap-2">
                {s.visibility === 'public' ? (
                  <Link to={`/test-suites/${s.id}`} className="flex-1 no-underline text-color hover:text-primary">{s.name}</Link>
                ) : (
                  <span className="flex-1">{s.name}</span>
                )}
                <Tag value={TEST_SUITE_VISIBILITY_LABEL[s.visibility]} severity={TEST_SUITE_VISIBILITY_SEVERITY[s.visibility]} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
