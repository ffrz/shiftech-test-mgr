// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';
import { LoginPage } from '../../pages/auth/LoginPage';

vi.mock('../../hooks/useAuth', () => ({
  useAuthContext: vi.fn(),
}));

vi.mock('../../config/app', () => ({
  APP_NAME: 'Testify',
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, Navigate: vi.fn(({ to }) => <div data-testid="redirect" data-to={to} />) };
});

const { useAuthContext } = await import('../../hooks/useAuth');
const { Navigate } = await import('react-router-dom');

function renderLogin(overrides: Partial<Record<string, unknown>> = {}) {
  const signInWithGoogle = vi.fn();

  (useAuthContext as Mock).mockReturnValue({
    session: null,
    user: null,
    profile: null,
    loading: false,
    isAdmin: false,
    signInWithGoogle,
    signOut: vi.fn(),
    reloadProfile: vi.fn(),
    ...overrides,
  });

  const result = render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
  return { ...result, signInWithGoogle };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('LoginPage', () => {
  it('renders the app name as the card title', () => {
    renderLogin();
    expect(screen.getByText('Testify')).toBeInTheDocument();
  });

  it('renders the description text', () => {
    renderLogin();
    expect(screen.getByText('Sign in to manage Test Plans and Test Cases')).toBeInTheDocument();
  });

  it('renders the Google sign-in button', () => {
    renderLogin();
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
  });

  it('calls signInWithGoogle when the button is clicked', () => {
    const { signInWithGoogle } = renderLogin();
    fireEvent.click(screen.getByRole('button', { name: /sign in with google/i }));
    expect(signInWithGoogle).toHaveBeenCalledOnce();
  });

  it('redirects to / when a session already exists', () => {
    renderLogin({ session: { user: { id: 'u1' } } });
    expect(Navigate).toHaveBeenCalledWith({ to: '/', replace: true }, undefined);
  });
});
