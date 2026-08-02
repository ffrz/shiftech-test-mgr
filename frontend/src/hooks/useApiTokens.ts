import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiTokenService, type TokenAccessLevel } from '../services/apiTokenService';
import { queryKeys } from './queryKeys';
import type { MintedApiToken, ProjectMemberRole } from '../types/domain';

export function useApiTokens(projectId: string) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.apiTokens(projectId),
    queryFn: () => apiTokenService.listByProject(projectId),
    enabled: !!projectId,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: queryKeys.apiTokens(projectId) });
  }

  async function mint(name: string, level: TokenAccessLevel, role: ProjectMemberRole): Promise<MintedApiToken | null> {
    try {
      const minted = await apiTokenService.mint(projectId, name, level, role);
      invalidate();
      return minted;
    } catch (err) {
      console.error('Failed to mint agent token', err);
      throw err;
    }
  }

  async function revoke(id: string): Promise<boolean> {
    try {
      await apiTokenService.revoke(id);
      invalidate();
      return true;
    } catch (err) {
      console.error('Failed to revoke agent token', err);
      return false;
    }
  }

  return {
    tokens: data ?? [],
    loading: isLoading,
    mint,
    revoke,
  };
}
