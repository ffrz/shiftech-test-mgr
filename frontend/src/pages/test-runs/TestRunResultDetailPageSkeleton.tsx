import { Card } from 'primereact/card';
import { Skeleton } from 'primereact/skeleton';

// Loading placeholder for the Test Run result detail page — mirrors its layout
// (header card with code/name + status + meta + summary stat tiles, then the
// result list rows) so the page doesn't flash a blank screen while the run loads.
export function TestRunResultDetailPageSkeleton() {
  return (
    <div className="page-fade-in">
      <Card className="mb-3">
        <div className="flex align-items-center justify-content-between gap-2">
          <div className="min-w-0 flex-1">
            <Skeleton width="16rem" height="1.75rem" />
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Skeleton width="6rem" height="2rem" borderRadius="4px" />
            <Skeleton width="2rem" height="2rem" borderRadius="50%" />
          </div>
        </div>

        <Skeleton width="4rem" height="1.5rem" borderRadius="16px" className="mt-3" />
        <Skeleton width="55%" height="1rem" className="mt-3" />

        <div className="flex flex-wrap gap-3 mt-3">
          <Skeleton width="12rem" height="1rem" />
          <Skeleton width="13rem" height="1rem" />
          <Skeleton width="11rem" height="1rem" />
          <Skeleton width="10rem" height="1rem" />
        </div>

        <div className="project-stat-grid project-stat-grid-compact mt-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="project-stat-tile project-stat-tile-compact">
              <div className="flex align-items-center gap-2 w-full">
                <Skeleton shape="circle" size="1.25rem" />
                <div className="flex-1">
                  <Skeleton width="2rem" height="1.25rem" className="mb-1" />
                  <Skeleton width="4rem" height="0.75rem" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card pt={{ body: { className: 'p-0' }, content: { className: 'p-0' } }}>
        <div className="p-4">
          <div className="flex flex-column gap-3">
            <Skeleton width="100%" height="3rem" borderRadius="6px" />
            <Skeleton width="100%" height="3rem" borderRadius="6px" />
            <Skeleton width="75%" height="3rem" borderRadius="6px" />
          </div>
        </div>
      </Card>
    </div>
  );
}
