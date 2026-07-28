import { Sidebar } from 'primereact/sidebar';
import { Button } from 'primereact/button';
import { Badge } from 'primereact/badge';
import { classNames } from 'primereact/utils';
import type { Notification } from '../../types/domain';
import { formatDateTime } from '../../helpers/dateFormatter';

interface NotificationPanelProps {
  visible: boolean;
  onHide: () => void;
  notifications: Notification[];
  unreadCount: number;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
  onNotificationClick?: (notification: Notification) => void;
}

export function NotificationPanel({
  visible,
  onHide,
  notifications,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
  onRemove,
  onClearAll,
  onNotificationClick,
}: NotificationPanelProps) {
  return (
    <Sidebar
      visible={visible}
      onHide={onHide}
      position="right"
      header={
        <div className="flex align-items-center gap-2">
          <i className="pi pi-bell" style={{ fontSize: '1.2rem' }} />
          <span className="text-xl font-semibold">Notifications</span>
          {unreadCount > 0 && <Badge value={unreadCount} />}
        </div>
      }
      className="w-25rem"
    >
      {notifications.length > 0 && (
        <div className="mb-3 flex gap-2">
          <Button
            label="Mark all as read"
            icon="pi pi-check"
            text
            size="small"
            onClick={onMarkAllRead}
          />
          <Button
            label="Clear all"
            icon="pi pi-trash"
            text
            size="small"
            severity="danger"
            onClick={onClearAll}
          />
        </div>
      )}
      {notifications.length === 0 ? (
        <div className="flex flex-column align-items-center justify-content-center" style={{ height: '200px' }}>
          <i className="pi pi-inbox text-color-secondary" style={{ fontSize: '2rem' }} />
          <p className="text-color-secondary mt-2">No notifications</p>
        </div>
      ) : (
        <div className="flex flex-column gap-1">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={classNames(
                'flex align-items-start gap-2 p-2 border-round transition-colors',
                {
                  'surface-ground': !n.isRead,
                  'hover:surface-hover': true,
                }
              )}
            >
              <div
                className="flex align-items-start gap-2 flex-1 cursor-pointer"
                style={{ minWidth: 0 }}
                onClick={() => {
                  if (!n.isRead) onMarkRead(n.id);
                  onNotificationClick?.(n);
                }}
              >
                <i
                  className={classNames(
                    'pi mt-1',
                    n.isRead ? 'pi-envelope-open text-color-secondary' : 'pi-envelope text-primary'
                  )}
                  style={{ fontSize: '1rem' }}
                />
                <div className="flex-1" style={{ minWidth: 0 }}>
                  <div className={classNames('text-sm', { 'font-semibold': !n.isRead })}>
                    {n.title}
                  </div>
                  {n.body && (
                    <div className="text-xs text-color-secondary mt-1 line-height-3">
                      {n.body}
                    </div>
                  )}
                  <div className="text-xs text-color-secondary mt-1">
                    {formatDateTime(n.createdAt)}
                  </div>
                </div>
              </div>
              <Button
                icon="pi pi-times"
                text
                rounded
                severity="secondary"
                className="p-1"
                style={{ width: '1.5rem', height: '1.5rem', flexShrink: 0 }}
                tooltip="Dismiss"
                tooltipOptions={{ position: 'left' }}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(n.id);
                }}
              />
            </div>
          ))}
        </div>
      )}
    </Sidebar>
  );
}
