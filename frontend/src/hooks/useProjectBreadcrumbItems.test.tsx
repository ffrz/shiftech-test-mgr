// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import { useProjectBreadcrumbItems } from './useProjectBreadcrumbItems';
import type { Profile } from '../types/domain';

vi.mock('./useAuth', () => ({
  useAuthContext: vi.fn(),
}));

vi.mock('../repositories/profileRepository', () => ({
  profileRepository: { findById: vi.fn() },
}));

const { useAuthContext } = await import('./useAuth');
const { profileRepository } = await import('../repositories/profileRepository');

const ownerProfile: Profile = {
  id: 'u2',
  username: 'janedoe',
  displayName: 'Jane Doe',
  avatarUrl: null,
  bio: null,
  usernameChanged: false,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

function renderItems(projectName: string | null | undefined, ownerId: string | null | undefined, projectPath?: string) {
  (useAuthContext as Mock).mockReturnValue({
    session: { user: { id: 'u1' } },
    user: { id: 'u1' },
    profile: null,
    loading: false,
    isAdmin: false,
  });
  (profileRepository.findById as Mock).mockResolvedValue(ownerProfile);

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderHook(() => useProjectBreadcrumbItems(projectName, ownerId, projectPath), {
    wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useProjectBreadcrumbItems', () => {
  it('returns an empty array when there is no project name', () => {
    const { result } = renderItems(null, 'u2');
    expect(result.current).toEqual([]);
  });

  it('returns only the project item for an own project', async () => {
    const { result } = renderItems('My Project', 'u1', '/projects/p1');
    await waitFor(() => expect(result.current).toHaveLength(1));
    expect(result.current).toEqual([{ label: 'My Project', path: '/projects/p1' }]);
  });

  it('prepends the owner username item for someone elses project', async () => {
    const { result } = renderItems('Shared Project', 'u2', '/projects/p2');
    await waitFor(() => expect(result.current).toHaveLength(2));
    expect(result.current).toEqual([
      { label: 'janedoe', path: '/@janedoe' },
      { label: 'Shared Project', path: '/projects/p2' },
    ]);
  });

  it('uses a plain label without path when projectPath is omitted', async () => {
    const { result } = renderItems('Shared Project', 'u2');
    await waitFor(() => expect(result.current).toHaveLength(2));
    expect(result.current[1]).toEqual({ label: 'Shared Project', path: undefined });
  });
});
