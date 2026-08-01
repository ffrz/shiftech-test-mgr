import { Card } from 'primereact/card';
import { Skeleton } from 'primereact/skeleton';

// Loading placeholder for the Test Suite detail page — mirrors its main section
// (header card with name + visibility + meta, then the items table card) so the
// page doesn't flash a blank screen while the suite and its items are fetched.
export function TestSuiteDetailPageSkeleton() {
  return (
    <div className="page-fade-in">
      <Card className="mb-3">
        <div className="flex align-items-center justify-content-between gap-2">
          <div className="flex align-items-center gap-2">
            <Skeleton width="14rem" height="1.75rem" />
            <Skeleton width="5rem" height="1.5rem" borderRadius="16px" />
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Skeleton width="2rem" height="2rem" borderRadius="50%" />
            <Skeleton width="2rem" height="2rem" borderRadius="50%" />
            <Skeleton width="2rem" height="2rem" borderRadius="50%" />
          </div>
        </div>

        <Skeleton width="70%" height="1rem" className="mt-3" />
        <Skeleton width="45%" height="1rem" className="mt-2" />

        <div className="flex flex-wrap gap-3 mt-3">
          <Skeleton width="12rem" height="1rem" />
          <Skeleton width="11rem" height="1rem" />
        </div>
      </Card>

      <Card pt={{ body: { className: 'p-0' }, content: { className: 'p-0' } }}>
        <div className="p-3">
          <Skeleton width="100%" height="2.5rem" borderRadius="6px" className="mb-3" />
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
