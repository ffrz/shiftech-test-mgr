import { useQuery, useQueryClient } from '@tanstack/react-query';
import { testPlanService } from '../services/testPlanService';
import { queryKeys } from './queryKeys';

// Just "which test cases are in scope for this plan" — no result/progress here.
// Execution history lives under Test Runs (see useTestRuns / useTestRunDetail).
export function useTestPlanDetail(testPlanId: string | null) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.testPlanCases(testPlanId ?? ''),
    queryFn: () => testPlanService.listCases(testPlanId!),
    enabled: !!testPlanId,
  });

  return {
    cases: data ?? [],
    loading: isLoading,
    reload: () =>
      testPlanId ? queryClient.invalidateQueries({ queryKey: queryKeys.testPlanCases(testPlanId) }) : Promise.resolve(),
  };
}
