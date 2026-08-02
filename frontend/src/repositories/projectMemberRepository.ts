import { projectMemberRepositoryAdapter } from './adapters/projectMemberResolver';
import type { ProjectMemberRole, ProjectMemberWithProfile, ProjectMemberInvitation } from '../types/domain';

export const projectMemberRepository = {
  findAllByProject(projectId: string): Promise<ProjectMemberWithProfile[]> {
    return projectMemberRepositoryAdapter.findAllByProject(projectId);
  },

  findOwnRole(projectId: string, userId: string): Promise<ProjectMemberRole | null> {
    return projectMemberRepositoryAdapter.findOwnRole(projectId, userId);
  },

  invite(projectId: string, userId: string, role: ProjectMemberRole, invitedBy: string): Promise<ProjectMemberWithProfile> {
    return projectMemberRepositoryAdapter.invite(projectId, userId, role, invitedBy);
  },

  listPendingInvitationsForUser(userId: string): Promise<ProjectMemberInvitation[]> {
    return projectMemberRepositoryAdapter.listPendingInvitationsForUser(userId);
  },

  respond(id: string, status: 'accepted' | 'declined'): Promise<void> {
    return projectMemberRepositoryAdapter.respond(id, status);
  },

  updateRole(id: string, role: ProjectMemberRole): Promise<void> {
    return projectMemberRepositoryAdapter.updateRole(id, role);
  },

  reinvite(id: string, role: ProjectMemberRole, invitedBy: string): Promise<ProjectMemberWithProfile> {
    return projectMemberRepositoryAdapter.reinvite(id, role, invitedBy);
  },

  remove(id: string): Promise<void> {
    return projectMemberRepositoryAdapter.remove(id);
  },
};
