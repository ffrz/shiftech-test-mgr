import { projectMemberRepository } from '../repositories/projectMemberRepository';
import { notificationService } from './notificationService';
import type { ProjectMemberRole } from '../types/domain';

export const projectMemberService = {
  listByProject(projectId: string) {
    return projectMemberRepository.findAllByProject(projectId);
  },

  getOwnRole(projectId: string, userId: string) {
    return projectMemberRepository.findOwnRole(projectId, userId);
  },

  async invite(projectId: string, userId: string, invitedBy: string, role: ProjectMemberRole = 'member') {
    const member = await projectMemberRepository.invite(projectId, userId, role, invitedBy);
    const projectSnap = await import('../repositories/projectRepository').then((m) =>
      m.projectRepository.findById(projectId),
    );
    await notificationService.create(
      userId,
      'project_invite',
      `You've been invited to ${projectSnap?.name ?? 'a project'}`,
      `Role: ${role}`,
      'project_member',
      member.id,
    );
    return member;
  },

  listOwnPendingInvitations(userId: string) {
    return projectMemberRepository.listPendingInvitationsForUser(userId);
  },

  accept(id: string) {
    return projectMemberRepository.respond(id, 'accepted');
  },

  decline(id: string) {
    return projectMemberRepository.respond(id, 'declined');
  },

  changeRole(id: string, role: ProjectMemberRole) {
    return projectMemberRepository.updateRole(id, role);
  },

  remove(id: string) {
    return projectMemberRepository.remove(id);
  },
};
