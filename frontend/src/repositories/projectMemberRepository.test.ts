import { describe, expect, it, vi } from 'vitest';

vi.stubEnv('VITE_DATA_SOURCE', 'mock');

const { projectMemberRepository } = await import('./projectMemberRepository');

describe('projectMemberRepository (VITE_DATA_SOURCE=mock)', () => {
  it('invite then findAllByProject shows the invited member', async () => {
    const member = await projectMemberRepository.invite('pm-p1', 'pm-u1', 'tester', 'pm-owner');
    const list = await projectMemberRepository.findAllByProject('pm-p1');
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      id: member.id,
      projectId: 'pm-p1',
      userId: 'pm-u1',
      role: 'tester',
      status: 'invited',
    });
  });

  it('findOwnRole returns null while the member is still invited', async () => {
    await projectMemberRepository.invite('pm-p2', 'pm-u2', 'manager', 'pm-owner');
    await expect(projectMemberRepository.findOwnRole('pm-p2', 'pm-u2')).resolves.toBeNull();
  });

  it('updateRole reflects the new role', async () => {
    const member = await projectMemberRepository.invite('pm-p3', 'pm-u3', 'tester', 'pm-owner');
    await projectMemberRepository.updateRole(member.id, 'supervisor');
    const list = await projectMemberRepository.findAllByProject('pm-p3');
    expect(list[0].role).toBe('supervisor');
  });

  it('respond accepted grants the role and clears pending invitations', async () => {
    const member = await projectMemberRepository.invite('pm-p4', 'pm-u4', 'tester', 'pm-owner');
    await projectMemberRepository.respond(member.id, 'accepted');
    await expect(projectMemberRepository.findOwnRole('pm-p4', 'pm-u4')).resolves.toBe('tester');
    await expect(projectMemberRepository.listPendingInvitationsForUser('pm-u4')).resolves.toEqual([]);
  });

  it('remove deletes the member', async () => {
    const member = await projectMemberRepository.invite('pm-p5', 'pm-u5', 'tester', 'pm-owner');
    await projectMemberRepository.remove(member.id);
    await expect(projectMemberRepository.findAllByProject('pm-p5')).resolves.toEqual([]);
  });

  it('reinvite resets status to invited with the updated role', async () => {
    const member = await projectMemberRepository.invite('pm-p6', 'pm-u6', 'tester', 'pm-owner');
    await projectMemberRepository.respond(member.id, 'declined');
    const reinvited = await projectMemberRepository.reinvite(member.id, 'supervisor', 'pm-owner-2');
    expect(reinvited.status).toBe('invited');
    expect(reinvited.role).toBe('supervisor');
    await expect(projectMemberRepository.findOwnRole('pm-p6', 'pm-u6')).resolves.toBeNull();
    const pending = await projectMemberRepository.listPendingInvitationsForUser('pm-u6');
    expect(pending).toHaveLength(1);
  });
});
