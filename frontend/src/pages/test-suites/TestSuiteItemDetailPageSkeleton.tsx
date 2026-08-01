import { Card } from 'primereact/card';
import { Skeleton } from 'primereact/skeleton';

// Loading placeholder for the Test Suite item detail page — mirrors its layout
// (header card with title + meta + stat tiles, then objective/preconditions/steps/
// notes content cards) so the page doesn't flash a blank screen while the item loads.
export function TestSuiteItemDetailPageSkeleton() {
  return (
    <div className="page-fade-in">
      <div className="detail-content-col mx-auto">
        <Card className="mb-3">
          <div className="flex align-items-start justify-content-between gap-2">
            <div className="min-w-0 flex align-items-center gap-2 flex-1">
              <Skeleton width="70%" height="1.75rem" />
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Skeleton width="2rem" height="2rem" borderRadius="50%" />
              <Skeleton width="2rem" height="2rem" borderRadius="50%" />
            </div>
          </div>

          <div className="flex align-items-center gap-2 mt-3">
            <Skeleton width="4rem" height="1.5rem" borderRadius="16px" />
            <Skeleton width="4rem" height="1.5rem" borderRadius="16px" />
          </div>

          <div className="flex flex-wrap gap-3 mt-3 mb-3">
            <Skeleton width="12rem" height="1rem" />
            <Skeleton width="11rem" height="1rem" />
            <Skeleton width="10rem" height="1rem" />
          </div>

          <div className="project-stat-grid project-stat-grid-fixed2">
            <div className="project-stat-tile">
              <div className="flex align-items-center gap-3 w-full">
                <Skeleton shape="circle" size="1.5rem" />
                <div className="flex-1">
                  <Skeleton width="6rem" height="1.25rem" className="mb-1" />
                  <Skeleton width="4rem" height="0.75rem" />
                </div>
              </div>
            </div>
            <div className="project-stat-tile">
              <div className="flex align-items-center gap-3 w-full">
                <Skeleton shape="circle" size="1.5rem" />
                <div className="flex-1">
                  <Skeleton width="6rem" height="1.25rem" className="mb-1" />
                  <Skeleton width="4rem" height="0.75rem" />
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Objective" className="mb-3 detail-content-card">
          <Skeleton width="100%" height="1rem" className="mb-2" />
          <Skeleton width="80%" height="1rem" />
        </Card>

        <Card title="Test Steps" className="mb-3 detail-content-card">
          <div className="flex flex-column gap-3">
            <Skeleton width="100%" height="1rem" />
            <Skeleton width="90%" height="1rem" />
            <Skeleton width="95%" height="1rem" />
          </div>
        </Card>
      </div>
    </div>
  );
}
