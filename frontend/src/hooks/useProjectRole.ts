import { useQuery } from '@tanstack/react-query';
import { useAuthContext } from './useAuth';
import { projectMemberService } from '../services/projectMemberService';

// Project-scoped permission helper: single place permission rules live on the frontend.
// RLS is the real security boundary — this only drives which actions the UI offers.

export function useProjectRole(projectId: string | undefined) {
  const { isAdmin, session } = useAuthContext();

  const { data: role } = useQuery({
    queryKey: ['projectRole', projectId, session?.user?.id] as const,
    queryFn: () => projectMemberService.getOwnRole(projectId!, session!.user!.id),
    enabled: !!projectId && !!session?.user,
    staleTime: 30000,
    gcTime: 60000,
  });

  const loading = role === undefined;

  const canEditContent = role === 'manager' || role === 'supervisor';
  const canDeleteContent = role === 'manager';
  const canManageSettings = role === 'manager';
  const canRunTests = role === 'manager' || role === 'supervisor' || role === 'tester';
  const canManageIssues = role === 'manager' || role === 'tester';
  const canArchiveProject = role === 'manager';
  const canDeleteProject = role === 'manager';

  return {
    loading,
    role: role ?? null,
    isAdmin,
    canEditContent,
    canDeleteContent,
    canManageSettings,
    canRunTests,
    canManageIssues,
    canArchiveProject,
    canDeleteProject,
  };
}
