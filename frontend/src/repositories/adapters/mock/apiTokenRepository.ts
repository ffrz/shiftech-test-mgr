import type { ApiToken, MintedApiToken, TokenScope } from '../../../types/domain';
import type { ApiTokenRepository } from '../../interfaces/apiTokenRepository';

let seq = 0;
function nextId(): string {
  seq += 1;
  return `mock-token-${seq}`;
}

export function createMockApiTokenRepository(seed: ApiToken[] = []): ApiTokenRepository {
  const store = new Map<string, ApiToken>(seed.map((t) => [t.id, t]));

  return {
    async findAllByProject(projectId: string): Promise<ApiToken[]> {
      return [...store.values()]
        .filter((t) => t.projectId === projectId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    async mint(projectId: string, name: string, scopes: TokenScope[]): Promise<MintedApiToken> {
      const id = nextId();
      const now = new Date().toISOString();
      const token: ApiToken = {
        id,
        projectId,
        name,
        tokenPrefix: 'tm_mock',
        scopes,
        createdBy: 'mock-user',
        createdAt: now,
        revokedAt: null,
      };
      store.set(id, token);
      return { id, token: `tm_mock_${id}` };
    },

    async revoke(id: string): Promise<void> {
      const existing = store.get(id);
      if (!existing) throw new Error(`mock token not found: ${id}`);
      store.set(id, { ...existing, revokedAt: new Date().toISOString() });
    },
  };
}
