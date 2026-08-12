import { useEffect } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { supabase } from '../config/supabaseClient';
import { queryKeys } from './queryKeys';

// Single centralized Realtime subscriber for the whole app — mounted once (see AppLayout),
// not per-hook or per-page. Every table write anywhere (this tab, another tab, another
// user's browser) replicates through Supabase Realtime as a postgres_changes event here,
// which invalidates the exact React Query cache entries that event affects. Repositories/
// services stay untouched — the only "current state" a page ever reads is the React Query
// cache, kept fresh by this invalidation rather than by any page polling or manually
// reloading after its own mutations.
//
// Payloads only contain the changed row's own columns — no joins — so a table missing a
// foreign key the relevant query is keyed on (test_results has no project_id, only
// test_run_id; test_plan_cases has no project_id, only test_plan_id) can't resolve that
// key precisely without an extra lookup query per event. Per product decision, those cases
// invalidate a broader prefix instead of adding a database round-trip to the event handler.

type ChangePayload<T> = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T;
  old: Partial<T>;
};

function rowId<T extends { id?: string }>(payload: ChangePayload<T>): string | undefined {
  return payload.new?.id ?? payload.old?.id;
}

function invalidate(queryClient: QueryClient, key: readonly unknown[]) {
  queryClient.invalidateQueries({ queryKey: key });
}

export function useRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('app-realtime-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'test_results' }, (payload) => {
        const p = payload as unknown as ChangePayload<{ id: string; test_run_id: string }>;
        const testRunId = p.new?.test_run_id ?? p.old?.test_run_id;
        if (!testRunId) return;
        invalidate(queryClient, queryKeys.testRun(testRunId));
        invalidate(queryClient, queryKeys.testRunResults(testRunId));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'test_runs' }, (payload) => {
        const p = payload as unknown as ChangePayload<{ id: string; project_id?: string; test_plan_id: string | null }>;
        const id = rowId(p);
        if (id) invalidate(queryClient, queryKeys.testRun(id));
        const projectId = p.new?.project_id ?? p.old?.project_id;
        if (projectId) {
          invalidate(queryClient, queryKeys.testRunsByProject(projectId));
        } else {
          invalidate(queryClient, ['testRuns']);
        }
        // testRunsByPlan doesn't have test_plan_id available for a delete's `old` row in
        // every case, and it's a much cheaper cache to over-invalidate than a lookup query.
        invalidate(queryClient, ['testRuns', 'byPlan']);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'issues' }, (payload) => {
        const p = payload as unknown as ChangePayload<{ id: string; project_id?: string }>;
        const id = rowId(p);
        if (id) invalidate(queryClient, queryKeys.issue(id));
        const projectId = p.new?.project_id ?? p.old?.project_id;
        if (projectId) {
          invalidate(queryClient, queryKeys.issuesByProject(projectId));
        } else {
          invalidate(queryClient, ['issues']);
        }
        // issuesByTestRun/issuesByTestResult are joined through issue_test_results, which
        // this event doesn't include — invalidate the whole 'issues' prefix to catch them.
        invalidate(queryClient, ['issues']);
        // dashboardMyWork is keyed by userId (['dashboard', 'myWork', userId]) — invalidate
        // the whole 'myWork' prefix rather than resolving which user's assignment changed.
        invalidate(queryClient, ['dashboard', 'myWork']);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'test_plan_cases' }, (payload) => {
        const p = payload as unknown as ChangePayload<{ id: string; test_plan_id: string }>;
        const testPlanId = p.new?.test_plan_id ?? p.old?.test_plan_id;
        if (testPlanId) invalidate(queryClient, queryKeys.testPlanCases(testPlanId));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'test_cases' }, (payload) => {
        const p = payload as unknown as ChangePayload<{ id: string; project_id: string }>;
        const id = rowId(p);
        if (id) invalidate(queryClient, queryKeys.testCase(id));
        const projectId = p.new?.project_id ?? p.old?.project_id;
        if (projectId) {
          invalidate(queryClient, queryKeys.testCases(projectId));
          invalidate(queryClient, queryKeys.testCasesWithDetails(projectId));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'modules' }, (payload) => {
        const p = payload as unknown as ChangePayload<{ id: string; project_id: string }>;
        const projectId = p.new?.project_id ?? p.old?.project_id;
        if (projectId) invalidate(queryClient, queryKeys.modules(projectId));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tags' }, (payload) => {
        const p = payload as unknown as ChangePayload<{ id: string; project_id: string }>;
        const projectId = p.new?.project_id ?? p.old?.project_id;
        if (projectId) invalidate(queryClient, queryKeys.tags(projectId));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, (payload) => {
        const p = payload as unknown as ChangePayload<{ id: string }>;
        const id = rowId(p);
        if (id) invalidate(queryClient, queryKeys.project(id));
        invalidate(queryClient, ['projects']);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        invalidate(queryClient, queryKeys.profiles());
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entity_activity' }, (payload) => {
        const p = payload as unknown as ChangePayload<{ id: string; entity_type: string; entity_id: string; project_id: string }>;
        const entityType = p.new?.entity_type ?? p.old?.entity_type;
        const entityId = p.new?.entity_id ?? p.old?.entity_id;
        const projectId = p.new?.project_id ?? p.old?.project_id;
        if (entityType && entityId) invalidate(queryClient, queryKeys.activity(entityType, entityId));
        if (projectId) invalidate(queryClient, ['activityLog', projectId]);
        invalidate(queryClient, queryKeys.dashboardActivity());
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, (payload) => {
        const p = payload as unknown as ChangePayload<{ id: string; user_id: string }>;
        const userId = p.new?.user_id ?? p.old?.user_id;
        if (userId) {
          invalidate(queryClient, queryKeys.notifications());
          invalidate(queryClient, queryKeys.notificationsUnreadCount());
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_members' }, (payload) => {
        const p = payload as unknown as ChangePayload<{ id: string; user_id: string; project_id: string }>;
        const userId = p.new?.user_id ?? p.old?.user_id;
        const projectId = p.new?.project_id ?? p.old?.project_id;
        if (userId) {
          invalidate(queryClient, queryKeys.ownPendingInvitations(userId));
          // role/access for this project may have just changed (e.g. removed as a member) —
          // ProjectDetailPage/useProjectRole key on ['projectRole', projectId, userId].
          if (projectId) invalidate(queryClient, ['projectRole', projectId, userId]);
        }
        if (projectId) invalidate(queryClient, queryKeys.projectMembers(projectId));
        invalidate(queryClient, ['dashboard']);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
