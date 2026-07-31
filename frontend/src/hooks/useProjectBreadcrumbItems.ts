import { useProjectOwnerProfile } from './useProjectOwnerProfile';
import type { BreadcrumbItem } from '../components/ui/Breadcrumb';

// Breadcrumb items for a project: plain project name when it's the current user's own
// project, "username" + "project name" as separate items when it belongs to someone else —
// keeping the username as its own item lets small screens collapse it into the "..." menu.
export function useProjectBreadcrumbItems(
  projectName: string | null | undefined,
  ownerId: string | null | undefined,
  projectPath?: string,
): BreadcrumbItem[] {
  const ownerProfile = useProjectOwnerProfile(ownerId);
  if (!projectName) return [];
  const items: BreadcrumbItem[] = [];
  if (ownerProfile?.username) {
    items.push({ label: ownerProfile.username, path: `/@${ownerProfile.username}` });
  }
  items.push({ label: projectName, path: projectPath });
  return items;
}
