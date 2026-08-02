import { apiTokenRepositoryAdapter } from './adapters/apiTokenResolver';
import type { ApiToken, MintedApiToken, TokenScope } from '../types/domain';

export const apiTokenRepository = {
  findAllByProject(projectId: string): Promise<ApiToken[]> {
    return apiTokenRepositoryAdapter.findAllByProject(projectId);
  },

  mint(projectId: string, name: string, scopes: TokenScope[]): Promise<MintedApiToken> {
    return apiTokenRepositoryAdapter.mint(projectId, name, scopes);
  },

  revoke(id: string): Promise<void> {
    return apiTokenRepositoryAdapter.revoke(id);
  },
};
