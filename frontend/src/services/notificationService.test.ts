import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../config/supabaseClient', () => ({
  supabase: { rpc: vi.fn() },
}));
vi.mock('../repositories/notificationRepository', () => ({
  notificationRepository: { removeByReference: vi.fn() },
}));

const { supabase } = await import('../config/supabaseClient');
const { notificationRepository } = await import('../repositories/notificationRepository');
const { notificationService } = await import('./notificationService');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('notificationService.create', () => {
  it('calls the create_notification RPC with mapped params', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ error: null });

    await notificationService.create('user-b', 'project_invite', 'You were invited', 'Role: Viewer', 'project_member', 'member-1');

    expect(supabase.rpc).toHaveBeenCalledWith('create_notification', {
      p_user_id: 'user-b',
      p_type: 'project_invite',
      p_title: 'You were invited',
      p_body: 'Role: Viewer',
      p_reference_type: 'project_member',
      p_reference_id: 'member-1',
    });
  });

  it('coalesces nullish optional params to null', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ error: null });

    await notificationService.create('user-b', 'mention', 'Mentioned');

    expect(supabase.rpc).toHaveBeenCalledWith('create_notification', {
      p_user_id: 'user-b',
      p_type: 'mention',
      p_title: 'Mentioned',
      p_body: null,
      p_reference_type: null,
      p_reference_id: null,
    });
  });

  it('throws when the RPC returns an error', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ error: new Error('rpc failed') });

    await expect(notificationService.create('user-b', 'mention', 'Mentioned')).rejects.toThrow('rpc failed');
  });
});

describe('notificationService.removeByReference', () => {
  it('delegates to the notification repository', async () => {
    vi.mocked(notificationRepository.removeByReference).mockResolvedValue(undefined);

    await notificationService.removeByReference('project_member', 'member-1');

    expect(notificationRepository.removeByReference).toHaveBeenCalledWith('project_member', 'member-1');
  });
});
