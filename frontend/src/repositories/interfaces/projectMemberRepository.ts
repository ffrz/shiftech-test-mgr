import type { ProjectMemberRole, ProjectMemberWithProfile, ProjectMemberInvitation } from '../../types/domain';

export interface ProjectMemberRepository {
  findAllByProject(projectId: string): Promise<ProjectMemberWithProfile[]>;
  findOwnRole(projectId: string, userId: string): Promise<ProjectMemberRole | null>;
  invite(projectId: string, userId: string, role: ProjectMemberRole, invitedBy: string): Promise<ProjectMemberWithProfile>;
  listPendingInvitationsForUser(userId: string): Promise<ProjectMemberInvitation[]>;
  respond(id: string, status: 'accepted' | 'declined'): Promise<void>;
  updateRole(id: string, role: ProjectMemberRole): Promise<void>;
  reinvite(id: string, role: ProjectMemberRole, invitedBy: string): Promise<ProjectMemberWithProfile>;
  remove(id: string): Promise<void>;
}
