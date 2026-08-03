import { useQuery, useQueryClient } from '@tanstack/react-query';
import { automationRunnerService } from '../services/automationRunnerService';
import { queryKeys } from './queryKeys';
import type { MintedAutomationRunner } from '../types/domain';

export function useAutomationRunners(projectId: string) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.automationRunners(projectId),
    queryFn: () => automationRunnerService.listByProject(projectId),
    enabled: !!projectId,
    // Runner status (online/offline) is derived from last_seen_at via heartbeat, which
    // changes on its own without any user action here — poll so the tab reflects a
    // runner going online/offline without a manual refresh.
    refetchInterval: 30_000,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: queryKeys.automationRunners(projectId) });
  }

  async function mint(name: string, labels: string[]): Promise<MintedAutomationRunner | null> {
    try {
      const minted = await automationRunnerService.mint(projectId, name, labels);
      invalidate();
      return minted;
    } catch (err) {
      console.error('Failed to mint automation runner token', err);
      throw err;
    }
  }

  return {
    runners: data ?? [],
    loading: isLoading,
    mint,
  };
}
