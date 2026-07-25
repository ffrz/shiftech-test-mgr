import { projectMemberRepository } from '../repositories/projectMemberRepository';
import type { ProjectMemberRole } from '../types/domain';

export const projectMemberService = {
  listByProject(projectId: string) {
    return projectMemberRepository.findAllByProject(projectId);
  },

  getOwnRole(projectId: string, userId: string) {
    return projectMemberRepository.findOwnRole(projectId, userId);
  },

  invite(projectId: string, userId: string, invitedBy: string, role: ProjectMemberRole = 'member') {
    return projectMemberRepository.invite(projectId, userId, role, invitedBy);
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
