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
}

export function NotificationPanel({
  visible,
  onHide,
  notifications,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
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
      {unreadCount > 0 && (
        <div className="mb-3">
          <Button
            label="Mark all as read"
            icon="pi pi-check"
            text
            size="small"
            onClick={onMarkAllRead}
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
                'flex align-items-start gap-2 p-2 border-round cursor-pointer transition-colors',
                {
                  'surface-ground': !n.isRead,
                  'hover:surface-hover': true,
                }
              )}
              onClick={() => { if (!n.isRead) onMarkRead(n.id); }}
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
          ))}
        </div>
      )}
    </Sidebar>
  );
}
