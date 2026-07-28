import { PROJECT_MEMBER_ROLE_LABEL } from '../helpers/statusLabels';
import { profileRepository } from '../repositories/profileRepository';
import { projectMemberRepository } from '../repositories/projectMemberRepository';
import { projectRepository } from '../repositories/projectRepository';
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
    const [projectSnap, inviterProfile] = await Promise.all([
      projectRepository.findById(projectId),
      profileRepository.findById(invitedBy),
    ]);
    const inviterName = inviterProfile?.displayName ?? inviterProfile?.username ?? 'Someone';
    await notificationService.create(
      userId,
      'project_invite',
      `${inviterName} invited you to ${projectSnap?.name ?? 'a project'}`,
      `Role: ${PROJECT_MEMBER_ROLE_LABEL[role]}`,
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

  async reinvite(id: string, projectId: string, userId: string, role: ProjectMemberRole, invitedBy: string) {
    const member = await projectMemberRepository.reinvite(id, role, invitedBy);
    const [projectSnap, inviterProfile] = await Promise.all([
      projectRepository.findById(projectId),
      profileRepository.findById(invitedBy),
    ]);
    const inviterName = inviterProfile?.displayName ?? inviterProfile?.username ?? 'Someone';
    await notificationService.create(
      userId,
      'project_invite',
      `${inviterName} re-invited you to ${projectSnap?.name ?? 'a project'}`,
      `Role: ${PROJECT_MEMBER_ROLE_LABEL[role]}`,
      'project_member',
      member.id,
    );
    return member;
  },

  changeRole(id: string, role: ProjectMemberRole) {
    return projectMemberRepository.updateRole(id, role);
  },

  async remove(id: string, projectId: string, userId: string) {
    await notificationService.removeByReference('project_member', id);
    await projectMemberRepository.remove(id);
    const projectSnap = await projectRepository.findById(projectId);
    await notificationService.create(
      userId,
      'project_member_removed',
      `You were removed from ${projectSnap?.name ?? 'a project'}`,
      null,
      'project',
      projectId,
    );
  },
};
