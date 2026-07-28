import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectRole } from './useProjectRole';

// Redirects to Home if the current user's role on this project disappears while they're
// on it (e.g. a manager removes them from project_members) -- useRealtimeSync invalidates
// the ['projectRole', projectId, userId] cache instantly on any project_members change, so
// this reacts within one realtime round-trip rather than waiting for the next navigation.
export function useProjectAccessGuard(projectId: string | undefined, onKicked?: () => void) {
  const navigate = useNavigate();
  const { role, loading } = useProjectRole(projectId);
  const hadRole = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (role) {
      hadRole.current = true;
      return;
    }
    if (hadRole.current) {
      onKicked?.();
      navigate('/', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, loading, projectId]);
}
