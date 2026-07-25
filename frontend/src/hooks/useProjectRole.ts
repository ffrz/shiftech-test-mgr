import { useEffect, useState } from 'react';
import { useAuthContext } from './useAuth';
import { projectMemberService } from '../services/projectMemberService';
import type { ProjectMemberRole } from '../types/domain';

// Project-scoped permission helper: single place permission rules live on the frontend.
// RLS is the real security boundary — this only drives which actions the UI offers.

export function useProjectRole(projectId: string | undefined) {
  const { isAdmin, session } = useAuthContext();
  const [role, setRole] = useState<ProjectMemberRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!projectId || !session?.user) {
        setRole(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      const result = await projectMemberService.getOwnRole(projectId, session.user.id);
      if (!cancelled) {
        setRole(result);
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [projectId, session?.user?.id]);

  const canEditContent = role === 'manager' || role === 'supervisor';
  const canDeleteContent = role === 'manager';
  const canManageSettings = role === 'manager';
  const canRunTests = role === 'manager' || role === 'tester';
  const canManageIssues = role === 'manager' || role === 'tester';
  const canArchiveProject = role === 'manager';
  const canDeleteProject = role === 'manager';

  return {
    loading,
    role,
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
