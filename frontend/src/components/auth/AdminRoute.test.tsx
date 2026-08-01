// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';
import { AdminRoute } from './AdminRoute';

vi.mock('../../hooks/useAuth', () => ({
  useAuthContext: vi.fn(),
}));

const { useAuthContext } = await import('../../hooks/useAuth');

function renderAdminRoute(isAdmin: boolean) {
  (useAuthContext as Mock).mockReturnValue({
    session: { user: { id: 'u1' } },
    user: { id: 'u1', email: 'test@test.com', role: isAdmin ? 'admin' : 'user', createdAt: '', updatedAt: '', deletedAt: null },
    profile: null,
    loading: false,
    isAdmin,
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
    reloadProfile: vi.fn(),
  });

  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<div>Admin Panel</div>} />
        </Route>
        <Route path="/" element={<div>Home Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('AdminRoute', () => {
  it('redirects non-admin users to /', () => {
    renderAdminRoute(false);
    expect(screen.getByText('Home Page')).toBeInTheDocument();
    expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
  });

  it('renders child routes for admin users', () => {
    renderAdminRoute(true);
    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    expect(screen.queryByText('Home Page')).not.toBeInTheDocument();
  });
});
