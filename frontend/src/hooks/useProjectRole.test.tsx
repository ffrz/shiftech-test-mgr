// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import { useProjectRole } from './useProjectRole';
import type { ProjectMemberRole } from '../types/domain';

vi.mock('./useAuth', () => ({
  useAuthContext: vi.fn(),
}));

vi.mock('../services/projectMemberService', () => ({
  projectMemberService: { getOwnRole: vi.fn() },
}));

const { useAuthContext } = await import('./useAuth');
const { projectMemberService } = await import('../services/projectMemberService');

function renderRole(role: ProjectMemberRole | null | undefined, isAdmin = false) {
  (useAuthContext as Mock).mockReturnValue({
    session: { user: { id: 'u1' } },
    user: { id: 'u1', email: 'a@b.c', role: isAdmin ? 'admin' : 'user', createdAt: '', updatedAt: '', deletedAt: null },
    profile: null,
    loading: false,
    isAdmin,
  });
  (projectMemberService.getOwnRole as Mock).mockResolvedValue(role);

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderHook(() => useProjectRole('proj-1'), {
    wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useProjectRole', () => {
  it('exposes full capabilities for a manager', async () => {
    const { result } = renderRole('manager');
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.role).toBe('manager');
    expect(result.current.canEditContent).toBe(true);
    expect(result.current.canDeleteContent).toBe(true);
    expect(result.current.canManageSettings).toBe(true);
    expect(result.current.canRunTests).toBe(true);
    expect(result.current.canManageIssues).toBe(true);
    expect(result.current.canArchiveProject).toBe(true);
    expect(result.current.canDeleteProject).toBe(true);
  });

  it('supervisor can edit + run tests but cannot delete/manage settings/issues', async () => {
    const { result } = renderRole('supervisor');
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.canEditContent).toBe(true);
    expect(result.current.canRunTests).toBe(true);
    expect(result.current.canDeleteContent).toBe(false);
    expect(result.current.canManageSettings).toBe(false);
    expect(result.current.canManageIssues).toBe(false);
    expect(result.current.canArchiveProject).toBe(false);
  });

  it('tester can run tests + manage issues but cannot edit content', async () => {
    const { result } = renderRole('tester');
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.canRunTests).toBe(true);
    expect(result.current.canManageIssues).toBe(true);
    expect(result.current.canEditContent).toBe(false);
    expect(result.current.canDeleteContent).toBe(false);
  });

  it('plain member gets no write capabilities', async () => {
    const { result } = renderRole('member');
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.canEditContent).toBe(false);
    expect(result.current.canRunTests).toBe(false);
    expect(result.current.canManageIssues).toBe(false);
    expect(result.current.canArchiveProject).toBe(false);
    expect(result.current.canDeleteProject).toBe(false);
  });

  it('returns null role when getOwnRole resolves null (not a member)', async () => {
    const { result } = renderRole(null);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.role).toBeNull();
  });

  it('flags isAdmin from auth regardless of project role', async () => {
    const { result } = renderRole('member', true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAdmin).toBe(true);
  });
});
