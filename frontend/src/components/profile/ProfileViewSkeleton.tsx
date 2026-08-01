import { Card } from 'primereact/card';
import { Skeleton } from 'primereact/skeleton';

// Loading placeholder for ProfileView — mirrors its card layout (header, bio,
// account info, projects, test suites) so the profile page doesn't flash raw
// text while profiles/projects/suites are being fetched.
export function ProfileViewSkeleton() {
  return (
    <div className="detail-content-col mx-auto">
      <Card className="mb-2 detail-content-card">
        <div className="flex align-items-center gap-3">
          <Skeleton shape="circle" size="4rem" />
          <div className="flex-1">
            <Skeleton width="10rem" className="mb-2" />
            <Skeleton width="6rem" />
          </div>
        </div>
      </Card>

      <Card title="Bio" className="mb-2 detail-content-card">
        <Skeleton width="100%" height="1rem" className="mb-2" />
        <Skeleton width="80%" height="1rem" />
      </Card>

      <Card title="Account Info" className="mb-2 detail-content-card">
        <Skeleton width="12rem" height="1rem" />
      </Card>

      <Card title="Projects" className="mb-2 detail-content-card">
        <div className="flex flex-column gap-2">
          <Skeleton width="100%" height="1.5rem" />
          <Skeleton width="100%" height="1.5rem" />
          <Skeleton width="70%" height="1.5rem" />
        </div>
      </Card>

      <Card title="Test Suites" className="mb-2 detail-content-card">
        <div className="flex flex-column gap-2">
          <Skeleton width="100%" height="1.5rem" />
          <Skeleton width="60%" height="1.5rem" />
        </div>
      </Card>
    </div>
  );
}
