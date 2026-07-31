import { useProjectOwnerProfile } from './useProjectOwnerProfile';
import { formatOwnedEntityBreadcrumbLabel } from '../helpers/breadcrumbFormatter';

// Breadcrumb label for a project: plain project name when it's the current user's own
// project, "username/project name" when it belongs to someone else.
export function useProjectBreadcrumbLabel(projectName: string | null | undefined, ownerId: string | null | undefined) {
  const ownerProfile = useProjectOwnerProfile(ownerId);
  if (!projectName) return '';
  return ownerProfile ? formatOwnedEntityBreadcrumbLabel(projectName, ownerProfile.username) : projectName;
}
