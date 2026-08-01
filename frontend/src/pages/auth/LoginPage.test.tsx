// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';
import { LoginPage } from '../../pages/auth/LoginPage';

vi.mock('../../hooks/useAuth', () => ({
  useAuthContext: vi.fn(),
}));

vi.mock('../../config/app', () => ({
  APP_NAME: 'Testify',
}));

const { useAuthContext } = await import('../../hooks/useAuth');

function renderLogin() {
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
  });

  const result = render(<LoginPage />);
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
});
