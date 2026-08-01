// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';
import { ProtectedRoute } from './ProtectedRoute';

vi.mock('../../hooks/useAuth', () => ({
  useAuthContext: vi.fn(),
}));

const { useAuthContext } = await import('../../hooks/useAuth');

function renderProtected(overrides: { loading?: boolean; session?: object | null }) {
  (useAuthContext as Mock).mockReturnValue({
    session: null,
    user: null,
    profile: null,
    loading: false,
    isAdmin: false,
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
    reloadProfile: vi.fn(),
    ...overrides,
  });

  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/protected" element={<div>Protected Content</div>} />
        </Route>
        <Route path="/login" element={<div>Login Page</div>} />
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

describe('ProtectedRoute', () => {
  it('shows a spinner while loading', () => {
    renderProtected({ loading: true });
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('redirects to /login when not authenticated', () => {
    renderProtected({ session: null });
    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders child routes when authenticated', () => {
    renderProtected({ session: { user: { id: 'u1' } } });
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });
});
