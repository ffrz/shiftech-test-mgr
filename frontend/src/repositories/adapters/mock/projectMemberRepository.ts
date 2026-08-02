import type { ProjectMemberRole, ProjectMemberWithProfile, ProjectMemberInvitation } from '../../../types/domain';
import type { ProjectMemberRepository } from '../../interfaces/projectMemberRepository';

let seq = 0;
function nextId(): string {
  seq += 1;
  return `mock-member-${seq}`;
}

function makeInvitation(member: ProjectMemberWithProfile, store: Map<string, ProjectMemberWithProfile>): ProjectMemberInvitation {
  let inviterUsername: string | null = null;
  let inviterDisplayName: string | null = null;
  if (member.invitedBy) {
    const inviter = [...store.values()].find((m) => m.userId === member.invitedBy);
    if (inviter?.profile) {
      inviterUsername = inviter.profile.username;
      inviterDisplayName = inviter.profile.displayName;
    }
  }
  return {
    ...member,
    project: { id: member.projectId, name: `Project ${member.projectId}` },
    inviterUsername,
    inviterDisplayName,
  };
}

export function createMockProjectMemberRepository(seed: ProjectMemberWithProfile[] = []): ProjectMemberRepository {
  const store = new Map<string, ProjectMemberWithProfile>(seed.map((m) => [m.id, m]));

  return {
    async findAllByProject(projectId: string): Promise<ProjectMemberWithProfile[]> {
      return [...store.values()]
        .filter((m) => m.projectId === projectId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },

    async findOwnRole(projectId: string, userId: string): Promise<ProjectMemberRole | null> {
      const member = [...store.values()].find(
        (m) => m.projectId === projectId && m.userId === userId && m.status === 'accepted',
      );
      return member?.role ?? null;
    },

    async invite(projectId: string, userId: string, role: ProjectMemberRole, invitedBy: string): Promise<ProjectMemberWithProfile> {
      const now = new Date().toISOString();
      const member: ProjectMemberWithProfile = {
        id: nextId(),
        projectId,
        userId,
        role,
        status: 'invited',
        invitedBy,
        invitedAt: now,
        respondedAt: null,
        createdAt: now,
        profile: null,
        email: '',
      };
      store.set(member.id, member);
      return member;
    },

    async listPendingInvitationsForUser(userId: string): Promise<ProjectMemberInvitation[]> {
      return [...store.values()]
        .filter((m) => m.userId === userId && m.status === 'invited')
        .map((m) => makeInvitation(m, store));
    },

    async respond(id: string, status: 'accepted' | 'declined'): Promise<void> {
      const existing = store.get(id);
      if (!existing) throw new Error(`mock member not found: ${id}`);
      const now = new Date().toISOString();
      store.set(id, { ...existing, status, respondedAt: now });
    },

    async updateRole(id: string, role: ProjectMemberRole): Promise<void> {
      const existing = store.get(id);
      if (!existing) throw new Error(`mock member not found: ${id}`);
      store.set(id, { ...existing, role });
    },

    async reinvite(id: string, role: ProjectMemberRole, invitedBy: string): Promise<ProjectMemberWithProfile> {
      const existing = store.get(id);
      if (!existing) throw new Error(`mock member not found: ${id}`);
      const now = new Date().toISOString();
      const updated: ProjectMemberWithProfile = {
        ...existing,
        status: 'invited',
        role,
        invitedBy,
        invitedAt: now,
        respondedAt: null,
      };
      store.set(id, updated);
      return updated;
    },

    async remove(id: string): Promise<void> {
      store.delete(id);
    },
  };
}
