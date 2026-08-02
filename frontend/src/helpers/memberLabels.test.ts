import { describe, expect, it } from 'vitest';
import type { Profile, ProjectMemberWithProfile } from '../types/domain';
import { memberSelectLabel } from './memberLabels';

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'u1',
    username: 'jdoe',
    displayName: 'John Doe',
    avatarUrl: null,
    bio: null,
    usernameChanged: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function member(overrides: Partial<ProjectMemberWithProfile> = {}): ProjectMemberWithProfile {
  return {
    id: 'm1',
    projectId: 'p1',
    userId: 'u1',
    role: 'member',
    status: 'accepted',
    invitedBy: null,
    invitedAt: '2026-01-01T00:00:00Z',
    respondedAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    email: 'jdoe@test.com',
    profile: profile(),
    ...overrides,
  } as ProjectMemberWithProfile;
}

describe('memberSelectLabel', () => {
  it('returns "username - Full Name" when both are present', () => {
    expect(memberSelectLabel(member())).toBe('jdoe - John Doe');
  });

  it('returns username only when there is no display name', () => {
    expect(memberSelectLabel(member({ profile: profile({ displayName: null }) }))).toBe('jdoe');
  });

  it('does not duplicate when display name equals the username', () => {
    expect(memberSelectLabel(member({ profile: profile({ displayName: 'jdoe' }) }))).toBe('jdoe');
  });

  it('falls back to email when there is no username', () => {
    expect(memberSelectLabel(member({ profile: profile({ username: '' }) }))).toBe('jdoe@test.com - John Doe');
  });
});

