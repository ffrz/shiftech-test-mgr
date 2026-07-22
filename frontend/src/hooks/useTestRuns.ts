import { useQuery, useQueryClient } from '@tanstack/react-query';
import { testRunService } from '../services/testRunService';
import { queryKeys } from './queryKeys';
import type { TestRun } from '../types/domain';

export interface TestRunWithSummary extends TestRun {
  total: number;
  pass: number;
  fail: number;
  testers: { id: string; fullName: string | null }[];
}

export function useTestRuns(testPlanId: string | null) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.testRunsByPlan(testPlanId ?? ''),
    queryFn: () => testRunService.listByPlanWithSummary(testPlanId!),
    enabled: !!testPlanId,
  });

  return {
    testRuns: (data ?? []) as TestRunWithSummary[],
    loading: isLoading,
    reload: () =>
      testPlanId ? queryClient.invalidateQueries({ queryKey: queryKeys.testRunsByPlan(testPlanId) }) : Promise.resolve(),
  };
}
