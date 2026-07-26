import { useQuery, useQueryClient } from '@tanstack/react-query';
import { testRunService } from '../services/testRunService';
import { queryKeys } from './queryKeys';
import type { TestRun, TestRunStatus } from '../types/domain';

export interface TestRunWithSummary extends TestRun {
  total: number;
  pass: number;
  fail: number;
  testers: { id: string; fullName: string | null }[];
}

export function useTestRuns(
  testPlanId: string | null,
  options?: { search?: string; statuses?: TestRunStatus[]; page?: number; rowsPerPage?: number },
) {
  const queryClient = useQueryClient();
  const page = options?.page ?? 1;
  const rowsPerPage = options?.rowsPerPage ?? 10;

  const { data, isLoading } = useQuery({
    queryKey: [...queryKeys.testRunsByPlan(testPlanId ?? ''), 'paginated', { ...options, page, rowsPerPage }],
    queryFn: () => {
      if (!testPlanId) return { data: [], total: 0 };
      return testRunService.listByPlanWithSummaryPaginated(testPlanId, { ...options, page, rowsPerPage });
    },
    enabled: !!testPlanId,
  });

  return {
    testRuns: (data?.data ?? []) as TestRunWithSummary[],
    total: data?.total ?? 0,
    loading: isLoading,
    reload: () =>
      testPlanId ? queryClient.invalidateQueries({ queryKey: queryKeys.testRunsByPlan(testPlanId) }) : Promise.resolve(),
  };
}
