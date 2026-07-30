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
    <div className="detail-content-col">
      <Card className="mb-3">
        <div className="flex align-items-center gap-3">
          <Avatar image={profile.avatarUrl ?? undefined} icon={profile.avatarUrl ? undefined : 'pi pi-user'} shape="circle" size="xlarge" />
          <div className="flex-1">
            <div className="flex align-items-center gap-2">
              <h2 className="m-0">{displayName}</h2>
              {isSpying && <Tag value="Spy" severity="warning" />}
            </div>
            <p className="m-0 text-color-secondary">@{profile.username}</p>
          </div>
          {adminOverlay}
        </div>
      </Card>

      {profile.bio && (
        <Card title="Bio" className="mb-3 detail-content-card">
          <p className="m-0">{profile.bio}</p>
        </Card>
      )}

      <Card title="Account Info" className="mb-3 detail-content-card">
        <div className="flex flex-wrap column-gap-4 row-gap-1 text-xs">
          <span className="text-color-secondary">
            <i className="pi pi-calendar-plus mr-1" style={{ fontSize: '0.75rem' }} />
            Member since <span className="text-color">{profile.createdAt ? formatDateTime(profile.createdAt) : '-'}</span>
          </span>
        </div>
      </Card>

      <Card title="Projects" className="mb-3 detail-content-card">
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

      <Card title="Test Suites" className="mb-3 detail-content-card">
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
