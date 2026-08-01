import { Card } from 'primereact/card';
import { Skeleton } from 'primereact/skeleton';

// Section-level loading placeholders for the Home dashboard. Each mirrors the real
// section's card layout (icon badge + title lines, stat tiles, etc.) so the page
// stays visually stable while its queries resolve, section by section.

export function MyWorkSectionSkeleton() {
  return (
    <div className="mb-4">
      <h3 className="mb-2 flex align-items-center gap-2"><i className="pi pi-briefcase text-primary" />My Work</h3>
      <div className="flex flex-column gap-2">
        {[0, 1].map((i) => (
          <Card key={i} pt={{ body: { className: 'py-3' } }}>
            <div className="flex align-items-center justify-content-between gap-3">
              <div className="flex align-items-center gap-3" style={{ minWidth: 0 }}>
                <Skeleton shape="circle" size="2.25rem" />
                <div style={{ minWidth: 0 }} className="flex-1">
                  <Skeleton width="70%" height="1rem" className="mb-2" />
                  <Skeleton width="40%" height="0.9rem" />
                </div>
              </div>
              <div className="flex align-items-center gap-2 flex-shrink-0">
                <Skeleton width="4rem" height="1.5rem" borderRadius="16px" />
                <Skeleton width="4rem" height="1.5rem" borderRadius="16px" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function ContinueWorkingSectionSkeleton() {
  return (
    <div className="mb-4">
      <h3 className="mb-2 flex align-items-center gap-2"><i className="pi pi-history text-primary" />Continue Working</h3>
      <div className="flex flex-column gap-2">
        {[0, 1, 2].map((i) => (
          <Card key={i} pt={{ body: { className: 'py-3' } }}>
            <div className="flex align-items-center justify-content-between gap-3">
              <div className="flex align-items-center gap-3">
                <Skeleton shape="circle" size="2.25rem" />
                <div>
                  <Skeleton width="12rem" height="1rem" className="mb-2" />
                  <Skeleton width="8rem" height="0.9rem" />
                </div>
              </div>
              <Skeleton width="1rem" height="1rem" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function RecentProjectsSectionSkeleton() {
  return (
    <div className="mb-4">
      <h3 className="mb-2 flex align-items-center gap-2"><i className="pi pi-folder text-primary" />Recent Projects</h3>
      <Card pt={{ body: { className: 'p-2' }, content: { className: 'p-0' } }}>
        <div className="flex flex-column gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex align-items-center justify-content-between gap-3 p-2 border-round">
              <span className="flex align-items-center gap-2 flex-1">
                <i className="pi pi-folder text-color-secondary" />
                <Skeleton width={`${[40, 60, 50, 35][i]}%`} height="1rem" />
              </span>
              <i className="pi pi-chevron-right text-color-secondary" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function StatisticsSectionSkeleton() {
  return (
    <div className="mb-4">
      <h3 className="mb-2 flex align-items-center gap-2"><i className="pi pi-chart-bar text-primary" />Statistics</h3>
      <div className="grid">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="col-12 md:col-3">
            <Card className="stat-card" pt={{ body: { className: 'py-3' } }}>
              <div className="flex align-items-center gap-3">
                <Skeleton shape="circle" size="2.25rem" />
                <div>
                  <Skeleton width="2.5rem" height="1.5rem" className="mb-1" />
                  <Skeleton width="5rem" height="0.9rem" />
                </div>
              </div>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ActivityFeedSectionSkeleton() {
  return (
    <div className="mb-4">
      <h3 className="mb-2 flex align-items-center gap-2"><i className="pi pi-list text-primary" />Activity Feed</h3>
      <Card pt={{ body: { className: 'p-2' }, content: { className: 'p-0' } }}>
        <div className="flex flex-column gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex align-items-start gap-2 p-2">
              <Skeleton shape="circle" size="1rem" className="mt-1" />
              <div className="flex-1">
                <Skeleton width="80%" height="0.9rem" className="mb-2" />
                <Skeleton width="30%" height="0.75rem" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
