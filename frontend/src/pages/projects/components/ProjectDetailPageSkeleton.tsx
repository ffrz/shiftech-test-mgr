import { Card } from 'primereact/card';
import { Skeleton } from 'primereact/skeleton';

// Loading placeholder for the Project detail page — mirrors its layout (header card
// with title + meta + stat tiles, then the tabbed content) so the page doesn't flash
// a blank/broken screen while the project and its tabs are being fetched.
export function ProjectDetailPageSkeleton() {
  return (
    <div className="page-fade-in">
      <Card className="mb-3">
        <div className="flex align-items-center justify-content-between gap-2">
          <div className="min-w-0 flex align-items-center gap-2">
            <Skeleton width="14rem" height="1.75rem" />
            <Skeleton width="5rem" height="1.5rem" borderRadius="16px" />
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Skeleton width="2rem" height="2rem" borderRadius="50%" />
            <Skeleton width="2rem" height="2rem" borderRadius="50%" />
          </div>
        </div>

        <Skeleton width="70%" height="1rem" className="mt-3" />
        <Skeleton width="40%" height="1rem" className="mt-2" />

        <div className="flex flex-wrap gap-2 mt-4 mb-3">
          <Skeleton width="10rem" height="1rem" />
          <Skeleton width="12rem" height="1rem" />
          <Skeleton width="11rem" height="1rem" />
        </div>

        <div className="project-stat-grid">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="project-stat-tile">
              <div className="flex align-items-center gap-3 w-full">
                <Skeleton shape="circle" size="1.5rem" />
                <div className="flex-1">
                  <Skeleton width="2.5rem" height="1.25rem" className="mb-1" />
                  <Skeleton width="4rem" height="0.75rem" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card pt={{ body: { className: 'p-0' }, content: { className: 'p-0' } }}>
        <div className="p-3 flex gap-4">
          <Skeleton width="6rem" height="1.25rem" />
          <Skeleton width="6rem" height="1.25rem" />
          <Skeleton width="6rem" height="1.25rem" />
          <Skeleton width="6rem" height="1.25rem" />
        </div>
        <div className="p-4">
          <div className="flex flex-column gap-3">
            <Skeleton width="100%" height="2.25rem" borderRadius="6px" />
            <Skeleton width="100%" height="2.25rem" borderRadius="6px" />
            <Skeleton width="70%" height="2.25rem" borderRadius="6px" />
          </div>
        </div>
      </Card>
    </div>
  );
}
