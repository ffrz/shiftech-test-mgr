// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, afterEach } from 'vitest';
import { ProfileView } from '../../components/profile/ProfileView';
import type { Profile, Project, TestSuite } from '../../types/domain';

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'u1',
    username: 'tester',
    displayName: 'Tester User',
    avatarUrl: null,
    bio: 'Hello world',
    usernameChanged: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
    ...overrides,
  };
}

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'p1',
    ownerId: 'u1',
    ownerType: 'user',
    name: 'My Project',
    description: null,
    status: 'active',
    visibility: 'public',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeSuite(overrides: Partial<TestSuite> = {}): TestSuite {
  return {
    id: 'ts1',
    ownerId: 'u1',
    visibility: 'public',
    name: 'My Suite',
    description: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function renderProfileView(overrides: Partial<{
  profile: Partial<Profile>;
  projects: Project[];
  suites: TestSuite[];
  isSpying: boolean;
  adminOverlay: React.ReactNode;
}> = {}) {
  return render(
    <MemoryRouter>
      <ProfileView
        profile={makeProfile(overrides.profile ?? {})}
        projects={overrides.projects ?? []}
        suites={overrides.suites ?? []}
        isSpying={overrides.isSpying}
        adminOverlay={overrides.adminOverlay}
      />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
});

describe('ProfileView', () => {
  describe('identity', () => {
    it('renders displayName when set', () => {
      renderProfileView({ profile: { displayName: 'Alice' } });
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    it('falls back to username when displayName is null', () => {
      renderProfileView({ profile: { displayName: null, username: 'alice99' } });
      const headings = screen.getAllByText('alice99');
      expect(headings.length).toBeGreaterThanOrEqual(1);
    });

    it('renders username below the display name', () => {
      renderProfileView({ profile: { username: 'alice99' } });
      expect(screen.getByText('alice99')).toBeInTheDocument();
    });

    it('renders a "Spy" badge when isSpying', () => {
      renderProfileView({ isSpying: true });
      expect(screen.getByText('Spy')).toBeInTheDocument();
    });

    it('does not render "Spy" badge normally', () => {
      renderProfileView();
      expect(screen.queryByText('Spy')).not.toBeInTheDocument();
    });

    it('renders adminOverlay when provided', () => {
      renderProfileView({ adminOverlay: <button>Admin Action</button> });
      expect(screen.getByText('Admin Action')).toBeInTheDocument();
    });
  });

  describe('bio', () => {
    it('renders bio section when bio is present', () => {
      renderProfileView({ profile: { bio: 'A short bio' } });
      expect(screen.getByText('A short bio')).toBeInTheDocument();
    });

    it('hides bio section when bio is null', () => {
      renderProfileView({ profile: { bio: null } });
      expect(screen.queryByText('Bio')).not.toBeInTheDocument();
    });

    it('hides bio section when bio is empty string', () => {
      renderProfileView({ profile: { bio: '' } });
      expect(screen.queryByText('Bio')).not.toBeInTheDocument();
    });
  });

  describe('account info', () => {
    it('renders Account Info card', () => {
      renderProfileView();
      expect(screen.getByText('Account Info')).toBeInTheDocument();
    });

    it('renders "Member since" with relative time', () => {
      renderProfileView({ profile: { createdAt: '2026-06-01T00:00:00Z' } });
      expect(screen.getByText(/Member since/)).toBeInTheDocument();
    });

    it('renders dash when createdAt is empty', () => {
      renderProfileView({ profile: { createdAt: '' } });
      expect(screen.getByText('-')).toBeInTheDocument();
    });
  });

  describe('projects', () => {
    it('shows "No projects." when list is empty', () => {
      renderProfileView({ projects: [] });
      expect(screen.getByText('No projects.')).toBeInTheDocument();
    });

    it('renders public project as a link', () => {
      renderProfileView({ projects: [makeProject({ name: 'Public Proj', visibility: 'public' })] });
      const link = screen.getByRole('link', { name: 'Public Proj' });
      expect(link).toHaveAttribute('href', '/projects/p1');
    });

    it('renders private project as plain text', () => {
      renderProfileView({ projects: [makeProject({ name: 'Secret', visibility: 'private' })] });
      expect(screen.getByText('Secret')).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Secret' })).not.toBeInTheDocument();
    });

    it('renders unlisted project as plain text', () => {
      renderProfileView({ projects: [makeProject({ name: 'Hidden', visibility: 'unlisted' })] });
      expect(screen.getByText('Hidden')).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Hidden' })).not.toBeInTheDocument();
    });

    it('renders multiple projects', () => {
      renderProfileView({
        projects: [
          makeProject({ id: 'p1', name: 'Alpha' }),
          makeProject({ id: 'p2', name: 'Beta' }),
        ],
      });
      expect(screen.getByText('Alpha')).toBeInTheDocument();
      expect(screen.getByText('Beta')).toBeInTheDocument();
    });

    it('renders visibility tag for each project', () => {
      renderProfileView({ projects: [makeProject({ visibility: 'private' })] });
      expect(screen.getByText('Private')).toBeInTheDocument();
    });
  });

  describe('test suites', () => {
    it('shows "No test suites." when list is empty', () => {
      renderProfileView({ suites: [] });
      expect(screen.getByText('No test suites.')).toBeInTheDocument();
    });

    it('renders public suite as a link', () => {
      renderProfileView({ suites: [makeSuite({ name: 'Public Suite', visibility: 'public' })] });
      const link = screen.getByRole('link', { name: 'Public Suite' });
      expect(link).toHaveAttribute('href', '/test-suites/ts1');
    });

    it('renders private suite as plain text', () => {
      renderProfileView({ suites: [makeSuite({ name: 'Private Suite', visibility: 'private' })] });
      expect(screen.getByText('Private Suite')).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Private Suite' })).not.toBeInTheDocument();
    });
  });
});
