import { describe, expect, it } from 'vitest';
import { createMockProjectMemberRepository } from './projectMemberRepository';
import type { ProjectMemberWithProfile } from '../../../types/domain';

function makeMember(overrides: Partial<ProjectMemberWithProfile> = {}): ProjectMemberWithProfile {
  return {
    id: 'm1',
    projectId: 'proj-1',
    userId: 'u1',
    role: 'member',
    status: 'accepted',
    invitedBy: null,
    invitedAt: '2025-01-01T00:00:00Z',
    respondedAt: null,
    createdAt: '2025-01-01T00:00:00Z',
    profile: null,
    email: '',
    ...overrides,
  };
}

describe('createMockProjectMemberRepository', () => {
  it('starts empty when no seed is given', async () => {
    const repo = createMockProjectMemberRepository();
    await expect(repo.findAllByProject('any')).resolves.toEqual([]);
  });

  it('invite() creates a member with status invited', async () => {
    const repo = createMockProjectMemberRepository();
    const member = await repo.invite('proj-1', 'u1', 'tester', 'inviter-u');

    expect(member.projectId).toBe('proj-1');
    expect(member.userId).toBe('u1');
    expect(member.role).toBe('tester');
    expect(member.status).toBe('invited');
    expect(member.invitedBy).toBe('inviter-u');
  });

  it('findAllByProject() returns members for the given project', async () => {
    const seeded = makeMember({ projectId: 'proj-1', userId: 'u1' });
    const repo = createMockProjectMemberRepository([seeded]);

    await expect(repo.findAllByProject('proj-1')).resolves.toEqual([seeded]);
    await expect(repo.findAllByProject('proj-2')).resolves.toEqual([]);
  });

  it('findOwnRole() returns role only when status is accepted', async () => {
    const accepted = makeMember({ id: 'm1', projectId: 'proj-1', userId: 'u1', role: 'manager', status: 'accepted' });
    const invited = makeMember({ id: 'm2', projectId: 'proj-1', userId: 'u2', role: 'tester', status: 'invited' });
    const repo = createMockProjectMemberRepository([accepted, invited]);

    await expect(repo.findOwnRole('proj-1', 'u1')).resolves.toBe('manager');
    await expect(repo.findOwnRole('proj-1', 'u2')).resolves.toBeNull();
    await expect(repo.findOwnRole('proj-1', 'u-none')).resolves.toBeNull();
  });

  it('updateRole() changes the role in subsequent reads', async () => {
    const seeded = makeMember({ id: 'm1', projectId: 'proj-1', userId: 'u1', role: 'member' });
    const repo = createMockProjectMemberRepository([seeded]);

    await repo.updateRole('m1', 'manager');

    const members = await repo.findAllByProject('proj-1');
    expect(members[0].role).toBe('manager');
  });

  it('respond() updates status and respondedAt', async () => {
    const seeded = makeMember({ id: 'm1', projectId: 'proj-1', userId: 'u1', status: 'invited', respondedAt: null });
    const repo = createMockProjectMemberRepository([seeded]);

    await repo.respond('m1', 'accepted');

    const members = await repo.findAllByProject('proj-1');
    expect(members[0].status).toBe('accepted');
    expect(members[0].respondedAt).not.toBeNull();
  });

  it('listPendingInvitationsForUser() returns only invited members for the user', async () => {
    const m1 = makeMember({ id: 'm1', projectId: 'proj-1', userId: 'u1', status: 'invited' });
    const m2 = makeMember({ id: 'm2', projectId: 'proj-2', userId: 'u1', status: 'accepted' });
    const m3 = makeMember({ id: 'm3', projectId: 'proj-3', userId: 'u1', status: 'invited' });
    const repo = createMockProjectMemberRepository([m1, m2, m3]);

    const invitations = await repo.listPendingInvitationsForUser('u1');

    expect(invitations).toHaveLength(2);
    expect(invitations.every((i) => i.status === 'invited')).toBe(true);
    expect(invitations[0].project?.id).toBe('proj-1');
    expect(invitations[1].project?.id).toBe('proj-3');
  });

  it('listPendingInvitationsForUser() resolves inviter info from store', async () => {
    const inviterProfile = {
      id: 'inviter-u',
      username: 'alice',
      displayName: 'Alice',
      avatarUrl: null,
      bio: null,
      usernameChanged: false,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    };
    const inviter = makeMember({
      id: 'm-inviter',
      projectId: 'proj-x',
      userId: 'inviter-u',
      role: 'manager',
      status: 'accepted',
      profile: inviterProfile,
      email: 'alice@example.com',
    });
    const invited = makeMember({
      id: 'm1',
      projectId: 'proj-1',
      userId: 'u-bob',
      status: 'invited',
      invitedBy: 'inviter-u',
    });
    const repo = createMockProjectMemberRepository([inviter, invited]);

    const invitations = await repo.listPendingInvitationsForUser('u-bob');

    expect(invitations).toHaveLength(1);
    expect(invitations[0].inviterUsername).toBe('alice');
    expect(invitations[0].inviterDisplayName).toBe('Alice');
  });

  it('reinvite() resets status to invited and clears respondedAt', async () => {
    const seeded = makeMember({
      id: 'm1',
      projectId: 'proj-1',
      userId: 'u1',
      status: 'declined',
      role: 'member',
      respondedAt: '2025-06-01T00:00:00Z',
      invitedBy: 'old-inviter',
    });
    const repo = createMockProjectMemberRepository([seeded]);

    const member = await repo.reinvite('m1', 'tester', 'new-inviter');

    expect(member.status).toBe('invited');
    expect(member.role).toBe('tester');
    expect(member.invitedBy).toBe('new-inviter');
    expect(member.respondedAt).toBeNull();
    expect(member.invitedAt).not.toBe('2025-01-01T00:00:00Z');
  });

  it('remove() deletes the member from the store', async () => {
    const seeded = makeMember({ id: 'm1', projectId: 'proj-1' });
    const repo = createMockProjectMemberRepository([seeded]);

    await repo.remove('m1');

    await expect(repo.findAllByProject('proj-1')).resolves.toEqual([]);
  });

  it('two instances do not share state', async () => {
    const repoA = createMockProjectMemberRepository();
    const repoB = createMockProjectMemberRepository();

    await repoA.invite('proj-1', 'u1', 'member', 'inviter-u');

    await expect(repoB.findAllByProject('proj-1')).resolves.toEqual([]);
  });
});
