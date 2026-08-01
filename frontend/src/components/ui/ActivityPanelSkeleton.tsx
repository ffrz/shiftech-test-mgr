import { Skeleton } from 'primereact/skeleton';

// Loading placeholder for ActivityPanel — mirrors its comment-thread layout (comment
// cards with avatar/name/timestamp + body lines, compact timeline rows for system
// events, and the comment editor card) so the panel doesn't flash raw text while
// activity loads. Used inside ActivityPanel itself, so every page embedding the panel
// (project / test plan / test case / test run / issue detail) gets the same placeholder
// without wiring it per page.
export function ActivityPanelSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="mt-3">
      {Array.from({ length: rows }).map((_, i) =>
        i % 3 === 2 ? (
          <div key={i} className="timeline-event-row">
            <Skeleton shape="circle" size="1.75rem" />
            <Skeleton width="55%" height="0.85rem" />
          </div>
        ) : (
          <div key={i} className="comment-card mb-3">
            <div className="comment-card-header">
              <Skeleton shape="circle" size="2rem" />
              <div className="flex-1 min-w-0">
                <Skeleton width="8rem" height="0.85rem" className="mb-1" />
                <Skeleton width="6rem" height="0.7rem" />
              </div>
            </div>
            <div className="comment-card-body">
              <Skeleton width="100%" height="0.85rem" className="mb-2" />
              <Skeleton width="80%" height="0.85rem" className="mb-2" />
              <Skeleton width="60%" height="0.85rem" />
            </div>
          </div>
        ),
      )}

      <div className="comment-editor-card">
        <div className="comment-editor-tabs">
          <Skeleton width="4rem" height="1.5rem" borderRadius="6px" />
          <Skeleton width="5rem" height="1.5rem" borderRadius="6px" />
        </div>
        <div className="comment-editor-body">
          <Skeleton width="100%" height="2.5rem" />
        </div>
        <div className="comment-editor-footer">
          <Skeleton width="8rem" height="1.5rem" borderRadius="6px" />
        </div>
      </div>
    </div>
  );
}
