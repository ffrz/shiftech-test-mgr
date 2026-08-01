import { Card } from 'primereact/card';
import { Skeleton } from 'primereact/skeleton';

// Loading placeholder for the Project Settings page — mirrors its layout (header
// card with back button + title, then the tabbed settings content) so the page
// doesn't flash raw text while project/module/tag/member data is being fetched.
export function ProjectSettingsPageSkeleton() {
  return (
    <div>
      <Card className="mb-3">
        <div className="flex align-items-start justify-content-between gap-2">
          <div className="flex align-items-start gap-2 min-w-0">
            <Skeleton width="2.25rem" height="2.25rem" borderRadius="50%" />
            <div className="min-w-0">
              <Skeleton width="14rem" height="1.75rem" className="mb-2" />
              <Skeleton width="20rem" height="1rem" />
            </div>
          </div>
          <Skeleton width="2rem" height="2rem" borderRadius="50%" />
        </div>
      </Card>

      <Card pt={{ body: { className: 'p-0' }, content: { className: 'p-0' } }}>
        <div className="p-3 flex gap-4">
          <Skeleton width="5rem" height="1.25rem" />
          <Skeleton width="4rem" height="1.25rem" />
          <Skeleton width="6rem" height="1.25rem" />
          <Skeleton width="8rem" height="1.25rem" />
        </div>
        <div className="p-4">
          <div className="flex flex-column gap-3">
            <Skeleton width="60%" height="2.25rem" borderRadius="6px" />
            <Skeleton width="100%" height="2.25rem" borderRadius="6px" />
            <Skeleton width="100%" height="2.25rem" borderRadius="6px" />
            <Skeleton width="45%" height="2.25rem" borderRadius="6px" />
          </div>
        </div>
      </Card>
    </div>
  );
}
