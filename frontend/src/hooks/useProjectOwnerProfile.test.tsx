// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import { useProjectOwnerProfile } from './useProjectOwnerProfile';
import type { Profile } from '../types/domain';

vi.mock('./useAuth', () => ({
  useAuthContext: vi.fn(),
}));

vi.mock('../repositories/profileRepository', () => ({
  profileRepository: { findById: vi.fn() },
}));

const { useAuthContext } = await import('./useAuth');
const { profileRepository } = await import('../repositories/profileRepository');

const otherProfile: Profile = {
  id: 'u2',
  username: 'janedoe',
  displayName: 'Jane Doe',
  avatarUrl: null,
  bio: null,
  usernameChanged: false,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

function renderOwner(ownerId: string | null | undefined, currentUserId: string | null | undefined = 'u1') {
  (useAuthContext as Mock).mockReturnValue({
    session: { user: { id: currentUserId } },
    user: currentUserId ? { id: currentUserId } : null,
    profile: null,
    loading: false,
    isAdmin: false,
  });
  (profileRepository.findById as Mock).mockResolvedValue(otherProfile);

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderHook(() => useProjectOwnerProfile(ownerId), {
    wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useProjectOwnerProfile', () => {
  it('returns null immediately for a project owned by the current user', () => {
    const { result } = renderOwner('u1');
    expect(result.current).toBeNull();
    expect(profileRepository.findById).not.toHaveBeenCalled();
  });

  it('returns null when ownerId is missing', () => {
    const { result } = renderOwner(null);
    expect(result.current).toBeNull();
  });

  it('returns null when no user is logged in', () => {
    const { result } = renderOwner('u2', null);
    expect(result.current).toBeNull();
    expect(profileRepository.findById).not.toHaveBeenCalled();
  });

  it('fetches and exposes the owner profile for another user', async () => {
    const { result } = renderOwner('u2');
    await waitFor(() => expect(result.current).toEqual(otherProfile));
    expect(profileRepository.findById).toHaveBeenCalledWith('u2');
  });

  it('does not fetch for an own project', async () => {
    renderOwner('u1');
    await waitFor(() => expect(profileRepository.findById).not.toHaveBeenCalled());
  });
});
