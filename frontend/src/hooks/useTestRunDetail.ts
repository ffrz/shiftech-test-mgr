import { useQuery, useQueryClient } from '@tanstack/react-query';
import { testRunService } from '../services/testRunService';
import { queryKeys } from './queryKeys';

interface Summary {
  total: number;
  executed: number;
  progressPercent: number;
  pass: number;
  fail: number;
  skip: number;
  blocked: number;
  notRun: number;
}

const EMPTY_SUMMARY: Summary = {
  total: 0,
  executed: 0,
  progressPercent: 0,
  pass: 0,
  fail: 0,
  skip: 0,
  blocked: 0,
  notRun: 0,
};

export function useTestRunDetail(testRunId: string | null) {
  const queryClient = useQueryClient();

  const testRunQuery = useQuery({
    queryKey: queryKeys.testRun(testRunId ?? ''),
    queryFn: () => testRunService.getById(testRunId!),
    enabled: !!testRunId,
  });

  const resultsQuery = useQuery({
    queryKey: queryKeys.testRunResults(testRunId ?? ''),
    queryFn: () => testRunService.getWithResults(testRunId!),
    enabled: !!testRunId,
  });

  async function reload() {
    if (!testRunId) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.testRun(testRunId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.testRunResults(testRunId) }),
    ]);
  }

  return {
    testRun: testRunQuery.data ?? null,
    results: resultsQuery.data?.results ?? [],
    summary: resultsQuery.data?.summary ?? EMPTY_SUMMARY,
    loading: testRunQuery.isLoading || resultsQuery.isLoading,
    reload,
  };
}
