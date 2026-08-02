import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../repositories/profileRepository', () => ({
  profileRepository: { findById: vi.fn() },
}));
vi.mock('../repositories/projectMemberRepository', () => ({
  projectMemberRepository: {
    findAllByProject: vi.fn(),
    findOwnRole: vi.fn(),
    invite: vi.fn(),
    listPendingInvitationsForUser: vi.fn(),
    respond: vi.fn(),
    reinvite: vi.fn(),
    updateRole: vi.fn(),
    remove: vi.fn(),
  },
}));
vi.mock('../repositories/projectRepository', () => ({
  projectRepository: { findById: vi.fn() },
}));
vi.mock('./notificationService', () => ({
  notificationService: {
    create: vi.fn(),
    removeByReference: vi.fn(),
  },
}));

const { profileRepository } = await import('../repositories/profileRepository');
const { projectMemberRepository } = await import('../repositories/projectMemberRepository');
const { projectRepository } = await import('../repositories/projectRepository');
const { notificationService } = await import('./notificationService');
const { projectMemberService } = await import('./projectMemberService');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('projectMemberService passthrough ops', () => {
  it('delegates listByProject', async () => {
    vi.mocked(projectMemberRepository.findAllByProject).mockResolvedValue([{ id: 'm1' } as never]);
    const result = await projectMemberService.listByProject('proj-1');
    expect(projectMemberRepository.findAllByProject).toHaveBeenCalledWith('proj-1');
    expect(result).toHaveLength(1);
  });

  it('delegates getOwnRole', async () => {
    vi.mocked(projectMemberRepository.findOwnRole).mockResolvedValue('manager' as never);
    const result = await projectMemberService.getOwnRole('proj-1', 'u1');
    expect(projectMemberRepository.findOwnRole).toHaveBeenCalledWith('proj-1', 'u1');
    expect(result).toBe('manager');
  });

  it('delegates listOwnPendingInvitations', async () => {
    vi.mocked(projectMemberRepository.listPendingInvitationsForUser).mockResolvedValue([{ id: 'm1' } as never]);
    const result = await projectMemberService.listOwnPendingInvitations('u1');
    expect(projectMemberRepository.listPendingInvitationsForUser).toHaveBeenCalledWith('u1');
    expect(result).toHaveLength(1);
  });

  it('accepts via respond(accepted)', async () => {
    vi.mocked(projectMemberRepository.respond).mockResolvedValue({ id: 'm1', status: 'accepted' } as never);
    await projectMemberService.accept('m1');
    expect(projectMemberRepository.respond).toHaveBeenCalledWith('m1', 'accepted');
  });

  it('declines via respond(declined)', async () => {
    vi.mocked(projectMemberRepository.respond).mockResolvedValue({ id: 'm1', status: 'declined' } as never);
    await projectMemberService.decline('m1');
    expect(projectMemberRepository.respond).toHaveBeenCalledWith('m1', 'declined');
  });

  it('changes role via updateRole', async () => {
    vi.mocked(projectMemberRepository.updateRole).mockResolvedValue({ id: 'm1', role: 'supervisor' } as never);
    await projectMemberService.changeRole('m1', 'supervisor');
    expect(projectMemberRepository.updateRole).toHaveBeenCalledWith('m1', 'supervisor');
  });
});

describe('projectMemberService.invite', () => {
  it('fetches project and inviter profile in parallel and composes the notification', async () => {
    vi.mocked(projectMemberRepository.invite).mockResolvedValue({ id: 'member-1' } as never);
    vi.mocked(projectRepository.findById).mockResolvedValue({ id: 'proj-1', name: 'Testify' } as never);
    vi.mocked(profileRepository.findById).mockResolvedValue({
      id: 'inviter-1',
      displayName: 'Alice',
      username: 'alice',
    } as never);

    const member = await projectMemberService.invite('proj-1', 'user-b', 'inviter-1', 'manager');

    expect(projectRepository.findById).toHaveBeenCalledWith('proj-1');
    expect(profileRepository.findById).toHaveBeenCalledWith('inviter-1');
    expect(notificationService.create).toHaveBeenCalledWith(
      'user-b',
      'project_invite',
      'Alice invited you to Testify',
      'Role: Owner',
      'project_member',
      'member-1',
    );
    expect(member).toEqual({ id: 'member-1' });
  });

  it('falls back to username when displayName is missing', async () => {
    vi.mocked(projectMemberRepository.invite).mockResolvedValue({ id: 'member-1' } as never);
    vi.mocked(projectRepository.findById).mockResolvedValue({ id: 'proj-1', name: 'Testify' } as never);
    vi.mocked(profileRepository.findById).mockResolvedValue({
      id: 'inviter-1',
      displayName: null,
      username: 'alice',
    } as never);

    await projectMemberService.invite('proj-1', 'user-b', 'inviter-1');

    expect(notificationService.create).toHaveBeenCalledWith(
      'user-b',
      'project_invite',
      'alice invited you to Testify',
      'Role: Viewer',
      'project_member',
      'member-1',
    );
  });

  it('falls back to "Someone" when the inviter profile is missing entirely', async () => {
    vi.mocked(projectMemberRepository.invite).mockResolvedValue({ id: 'member-1' } as never);
    vi.mocked(projectRepository.findById).mockResolvedValue({ id: 'proj-1', name: 'Testify' } as never);
    vi.mocked(profileRepository.findById).mockResolvedValue(null);

    await projectMemberService.invite('proj-1', 'user-b', 'inviter-1');

    expect(notificationService.create).toHaveBeenCalledWith(
      expect.anything(),
      'project_invite',
      'Someone invited you to Testify',
      'Role: Viewer',
      'project_member',
      'member-1',
    );
  });

  it('falls back to "a project" when the project snapshot is missing', async () => {
    vi.mocked(projectMemberRepository.invite).mockResolvedValue({ id: 'member-1' } as never);
    vi.mocked(projectRepository.findById).mockResolvedValue(null);
    vi.mocked(profileRepository.findById).mockResolvedValue({ id: 'inviter-1', displayName: 'Alice' } as never);

    await projectMemberService.invite('proj-1', 'user-b', 'inviter-1');

    expect(notificationService.create).toHaveBeenCalledWith(
      expect.anything(),
      'project_invite',
      'Alice invited you to a project',
      'Role: Viewer',
      'project_member',
      'member-1',
    );
  });
});

describe('projectMemberService.reinvite', () => {
  it('composes the re-invite message with the same fallback rules', async () => {
    vi.mocked(projectMemberRepository.reinvite).mockResolvedValue({ id: 'member-1' } as never);
    vi.mocked(projectRepository.findById).mockResolvedValue({ id: 'proj-1', name: 'Testify' } as never);
    vi.mocked(profileRepository.findById).mockResolvedValue(null);

    await projectMemberService.reinvite('member-1', 'proj-1', 'user-b', 'tester', 'inviter-1');

    expect(projectMemberRepository.reinvite).toHaveBeenCalledWith('member-1', 'tester', 'inviter-1');
    expect(notificationService.create).toHaveBeenCalledWith(
      'user-b',
      'project_invite',
      'Someone re-invited you to Testify',
      'Role: Tester',
      'project_member',
      'member-1',
    );
  });

  it('falls back to "a project" when the project snapshot is missing', async () => {
    vi.mocked(projectMemberRepository.reinvite).mockResolvedValue({ id: 'member-1' } as never);
    vi.mocked(projectRepository.findById).mockResolvedValue(null);
    vi.mocked(profileRepository.findById).mockResolvedValue(null);

    await projectMemberService.reinvite('member-1', 'proj-1', 'user-b', 'tester', 'inviter-1');

    expect(notificationService.create).toHaveBeenCalledWith(
      'user-b',
      'project_invite',
      'Someone re-invited you to a project',
      'Role: Tester',
      'project_member',
      'member-1',
    );
  });
});

describe('projectMemberService.remove', () => {
  it('removes old notifications first, then the member, then notifies the removed user', async () => {
    vi.mocked(projectRepository.findById).mockResolvedValue({ id: 'proj-1', name: 'Testify' } as never);
    vi.mocked(notificationService.create).mockResolvedValue(undefined);
    vi.mocked(notificationService.removeByReference).mockResolvedValue(undefined);
    vi.mocked(projectMemberRepository.remove).mockResolvedValue(undefined);

    await projectMemberService.remove('member-1', 'proj-1', 'user-b');

    const order = [
      vi.mocked(notificationService.removeByReference).mock.invocationCallOrder[0],
      vi.mocked(projectMemberRepository.remove).mock.invocationCallOrder[0],
      vi.mocked(projectRepository.findById).mock.invocationCallOrder[0],
      vi.mocked(notificationService.create).mock.invocationCallOrder[0],
    ];
    expect(order).toEqual([...order].sort((a, b) => a - b));

    expect(notificationService.removeByReference).toHaveBeenCalledWith('project_member', 'member-1');
    expect(projectMemberRepository.remove).toHaveBeenCalledWith('member-1');
    expect(notificationService.create).toHaveBeenCalledWith(
      'user-b',
      'project_member_removed',
      'You were removed from Testify',
      null,
      'project',
      'proj-1',
    );
  });

  it('falls back to "a project" when the project snapshot is missing', async () => {
    vi.mocked(projectRepository.findById).mockResolvedValue(null);
    vi.mocked(notificationService.create).mockResolvedValue(undefined);
    vi.mocked(notificationService.removeByReference).mockResolvedValue(undefined);
    vi.mocked(projectMemberRepository.remove).mockResolvedValue(undefined);

    await projectMemberService.remove('member-1', 'proj-1', 'user-b');

    expect(notificationService.create).toHaveBeenCalledWith(
      'user-b',
      'project_member_removed',
      'You were removed from a project',
      null,
      'project',
      'proj-1',
    );
  });
});
