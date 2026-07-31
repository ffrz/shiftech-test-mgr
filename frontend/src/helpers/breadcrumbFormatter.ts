const USERNAME_MAX_LENGTH = 20;

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;
}

// Breadcrumb label for an owned entity (Project, Test Suite) not owned by the current
// user: "username/entity name", with the username ellipsis-truncated past 20 chars so
// a long username can't push the entity name off-screen.
export function formatOwnedEntityBreadcrumbLabel(entityName: string, ownerUsername?: string | null): string {
  if (!ownerUsername) return entityName;
  return `${truncate(ownerUsername, USERNAME_MAX_LENGTH)}/${entityName}`;
}
