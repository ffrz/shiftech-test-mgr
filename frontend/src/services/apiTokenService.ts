import { apiTokenRepository } from '../repositories/apiTokenRepository';
import type { ApiToken, MintedApiToken, ProjectMemberRole, TokenScope } from '../types/domain';

// Mirrors allowed_token_scopes() in supabase/migrations/20260802170708_api_tokens_mint_rpc.sql —
// the SQL function is the source of truth (enforced server-side); this exists only so the UI
// can show the right scope options and fail fast before round-tripping to the RPC.
export const ROLE_TOKEN_SCOPES: Record<ProjectMemberRole, TokenScope[]> = {
  manager: [
    'read:project', 'read:test-cases', 'read:test-plans', 'read:test-runs', 'read:issues', 'read:automation',
    'write:test-cases', 'write:test-plans', 'write:test-runs', 'write:issues', 'write:automation',
  ],
  supervisor: [
    'read:project', 'read:test-cases', 'read:test-plans', 'read:test-runs', 'read:issues', 'read:automation',
    'write:test-cases', 'write:test-plans', 'write:issues',
  ],
  tester: [
    'read:project', 'read:test-cases', 'read:test-plans', 'read:test-runs', 'read:issues', 'read:automation',
    'write:test-runs', 'write:issues',
  ],
  member: [
    'read:project', 'read:test-cases', 'read:test-plans', 'read:test-runs', 'read:issues', 'read:automation',
  ],
};

// Agent tokens are meant to mirror the issuing member's own project access, not an
// independently-picked list of scopes. The only choice exposed to the user is whether the
// agent may write at all — the exact write:* scopes still come from the role cap above, so
// an agent never gets more access than the human who created its token.
export type TokenAccessLevel = 'readonly' | 'readwrite';

export function scopesForAccessLevel(role: ProjectMemberRole, level: TokenAccessLevel): TokenScope[] {
  const allowed = ROLE_TOKEN_SCOPES[role];
  if (level === 'readonly') return allowed.filter((s) => s.startsWith('read:'));
  return allowed;
}

// Inverse of the above, for display: a token's raw scope list is an implementation
// detail — the UI only ever shows whether it can write at all.
export function accessLevelForScopes(scopes: TokenScope[]): TokenAccessLevel {
  return scopes.some((s) => s.startsWith('write:')) ? 'readwrite' : 'readonly';
}

export const apiTokenService = {
  listByProject(projectId: string): Promise<ApiToken[]> {
    return apiTokenRepository.findAllByProject(projectId);
  },

  mint(projectId: string, name: string, level: TokenAccessLevel, role: ProjectMemberRole): Promise<MintedApiToken> {
    const scopes = scopesForAccessLevel(role, level);
    return apiTokenRepository.mint(projectId, name, scopes);
  },

  revoke(id: string): Promise<void> {
    return apiTokenRepository.revoke(id);
  },
};
