import type { ApiToken, MintedApiToken, TokenScope } from '../../types/domain';

export interface ApiTokenRepository {
  findAllByProject(projectId: string): Promise<ApiToken[]>;
  mint(projectId: string, name: string, scopes: TokenScope[]): Promise<MintedApiToken>;
  revoke(id: string): Promise<void>;
}
