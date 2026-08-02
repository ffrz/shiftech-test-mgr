import type { ProjectMemberWithProfile } from '../types/domain';

/**
 * Label for a project member in user selects/filters. Usernames are unique, so
 * they're the stable identifier (display names can repeat → duplicates). When a
 * full name is available it's appended as "username - Full Name" so the option
 * stays scannable while remaining non-duplicable.
 */
export function memberSelectLabel(member: ProjectMemberWithProfile): string {
  const username = member.profile?.username || member.email;
  const displayName = member.profile?.displayName;
  if (displayName && displayName.trim() && displayName !== username) {
    return `${username} - ${displayName}`;
  }
  return username || '';
}
