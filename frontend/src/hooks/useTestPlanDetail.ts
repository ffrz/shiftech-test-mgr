import { useQuery, useQueryClient } from '@tanstack/react-query';
import { testPlanService } from '../services/testPlanService';
import { queryKeys } from './queryKeys';

export function useTestPlanDetail(
  testPlanId: string | null,
  options?: { search?: string; priorities?: string[]; moduleIds?: string[]; tagIds?: string[]; page?: number; rowsPerPage?: number },
) {
  const queryClient = useQueryClient();
  const page = options?.page ?? 1;
  const rowsPerPage = options?.rowsPerPage ?? 10;

  const { data, isLoading } = useQuery({
    queryKey: [...queryKeys.testPlanCases(testPlanId ?? ''), 'paginated', { ...options, page, rowsPerPage }],
    queryFn: () => {
      if (!testPlanId) return { data: [], total: 0 };
      return testPlanService.listCasesPaginated(testPlanId, { ...options, page, rowsPerPage });
    },
    enabled: !!testPlanId,
  });

  return {
    cases: data?.data ?? [],
    total: data?.total ?? 0,
    loading: isLoading,
    reload: () =>
      testPlanId ? queryClient.invalidateQueries({ queryKey: queryKeys.testPlanCases(testPlanId) }) : Promise.resolve(),
  };
}
