// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { NotificationPanel } from '../../components/notifications/NotificationPanel';
import type { Notification } from '../../types/domain';

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'n1',
    userId: 'u1',
    type: 'project_invite',
    title: 'Invited to project',
    body: 'You have been invited to My Project',
    referenceType: 'project',
    referenceId: 'p1',
    isRead: false,
    createdAt: '2026-06-01T00:00:00Z',
    ...overrides,
  };
}

function renderPanel(overrides: Partial<{
  visible: boolean;
  notifications: Notification[];
  unreadCount: number;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
  onNotificationClick: (n: Notification) => void;
}> = {}) {
  return render(
    <NotificationPanel
      visible={overrides.visible ?? true}
      onHide={vi.fn()}
      notifications={overrides.notifications ?? []}
      unreadCount={overrides.unreadCount ?? 0}
      onMarkRead={overrides.onMarkRead ?? vi.fn()}
      onMarkAllRead={overrides.onMarkAllRead ?? vi.fn()}
      onRemove={overrides.onRemove ?? vi.fn()}
      onClearAll={overrides.onClearAll ?? vi.fn()}
      onNotificationClick={overrides.onNotificationClick}
    />,
  );
}

afterEach(() => {
  cleanup();
});

describe('NotificationPanel', () => {
  describe('empty state', () => {
    it('shows empty message when no notifications', () => {
      renderPanel({ notifications: [] });
      expect(screen.getByText('No notifications')).toBeInTheDocument();
    });

    it('does not show action bar when empty', () => {
      renderPanel({ notifications: [] });
      expect(screen.queryByText('Mark all as read')).not.toBeInTheDocument();
      expect(screen.queryByText('Clear all')).not.toBeInTheDocument();
    });
  });

  describe('header', () => {
    it('renders the Notifications title', () => {
      renderPanel();
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });

    it('shows unread badge when count > 0', () => {
      renderPanel({ notifications: [makeNotification()], unreadCount: 3 });
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('hides unread badge when count is 0', () => {
      renderPanel({ notifications: [makeNotification({ isRead: true })], unreadCount: 0 });
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });
  });

  describe('action bar', () => {
    it('renders "Mark all as read" button', () => {
      renderPanel({ notifications: [makeNotification()] });
      expect(screen.getByText('Mark all as read')).toBeInTheDocument();
    });

    it('renders "Clear all" button', () => {
      renderPanel({ notifications: [makeNotification()] });
      expect(screen.getByText('Clear all')).toBeInTheDocument();
    });

    it('calls onMarkAllRead when clicked', () => {
      const onMarkAllRead = vi.fn();
      renderPanel({ notifications: [makeNotification()], onMarkAllRead });
      fireEvent.click(screen.getByText('Mark all as read'));
      expect(onMarkAllRead).toHaveBeenCalledOnce();
    });

    it('calls onClearAll when clicked', () => {
      const onClearAll = vi.fn();
      renderPanel({ notifications: [makeNotification()], onClearAll });
      fireEvent.click(screen.getByText('Clear all'));
      expect(onClearAll).toHaveBeenCalledOnce();
    });
  });

  describe('notification list', () => {
    it('renders notification title and body', () => {
      renderPanel({ notifications: [makeNotification({ title: 'Alert', body: 'Something happened' })] });
      expect(screen.getByText('Alert')).toBeInTheDocument();
      expect(screen.getByText('Something happened')).toBeInTheDocument();
    });

    it('renders notification without body', () => {
      renderPanel({ notifications: [makeNotification({ title: 'Alert', body: null })] });
      expect(screen.getByText('Alert')).toBeInTheDocument();
    });

    it('renders multiple notifications', () => {
      renderPanel({
        notifications: [
          makeNotification({ id: 'n1', title: 'First' }),
          makeNotification({ id: 'n2', title: 'Second' }),
        ],
      });
      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
    });

    it('calls onMarkRead and onNotificationClick when notification body is clicked', () => {
      const onMarkRead = vi.fn();
      const onNotificationClick = vi.fn();
      renderPanel({
        notifications: [makeNotification({ id: 'n1', isRead: false })],
        onMarkRead,
        onNotificationClick,
      });
      fireEvent.click(screen.getByText('Invited to project'));
      expect(onMarkRead).toHaveBeenCalledWith('n1');
      expect(onNotificationClick).toHaveBeenCalled();
    });

    it('skips onMarkRead when notification is already read', () => {
      const onMarkRead = vi.fn();
      const onNotificationClick = vi.fn();
      renderPanel({
        notifications: [makeNotification({ id: 'n1', isRead: true })],
        onMarkRead,
        onNotificationClick,
      });
      fireEvent.click(screen.getByText('Invited to project'));
      expect(onMarkRead).not.toHaveBeenCalled();
      expect(onNotificationClick).toHaveBeenCalled();
    });

    it('calls onRemove when dismiss button is clicked', () => {
      const onRemove = vi.fn();
      const onNotificationClick = vi.fn();
      renderPanel({
        notifications: [makeNotification({ id: 'n1' })],
        onRemove,
        onNotificationClick,
      });
      const dismissBtn = screen.getByRole('button', { name: '' }); // icon-only dismiss button
      fireEvent.click(dismissBtn);
      expect(onRemove).toHaveBeenCalledWith('n1');
      // stopPropagation ensures notification click is NOT fired
      expect(onNotificationClick).not.toHaveBeenCalled();
    });
  });

  describe('notification icons', () => {
    it('uses pi-user-plus for project_invite type', () => {
      renderPanel({ notifications: [makeNotification({ type: 'project_invite' })] });
      expect(document.querySelector('.pi-user-plus')).toBeTruthy();
    });

    it('uses pi-user-minus for project_member_removed type', () => {
      renderPanel({ notifications: [makeNotification({ type: 'project_member_removed' })] });
      expect(document.querySelector('.pi-user-minus')).toBeTruthy();
    });

    it('falls back to pi-envelope for unknown type', () => {
      renderPanel({ notifications: [makeNotification({ type: 'custom_event' })] });
      expect(document.querySelector('.pi-envelope')).toBeTruthy();
    });
  });
});
