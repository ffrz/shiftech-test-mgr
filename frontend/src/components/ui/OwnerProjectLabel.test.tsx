// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react';
import { describe, expect, it, afterEach } from 'vitest';
import { OwnerProjectLabel } from '../../components/ui/OwnerProjectLabel';

afterEach(() => {
  cleanup();
});

describe('OwnerProjectLabel', () => {
  it('renders "username / project" when username is set', () => {
    render(<OwnerProjectLabel username="alice" name="My Project" />);
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('My Project')).toBeInTheDocument();
    // slash is inside its own <span class="owner-project-label-sep">
    expect(document.querySelector('.owner-project-label-sep')).toBeTruthy();
  });

  it('renders only project name when username is null', () => {
    render(<OwnerProjectLabel username={null} name="My Project" />);
    expect(screen.getByText('My Project')).toBeInTheDocument();
    expect(screen.queryByText(' / ')).not.toBeInTheDocument();
  });

  it('truncates username at default 20 chars', () => {
    render(<OwnerProjectLabel username="abcdefghijklmnopqrstuvwxyz" name="Proj" />);
    expect(screen.getByText('abcdefghijklmnopqrst…')).toBeInTheDocument();
  });

  it('truncates username at custom maxOwnerLength', () => {
    render(<OwnerProjectLabel username="longusername" name="Proj" maxOwnerLength={4} />);
    expect(screen.getByText('long…')).toBeInTheDocument();
  });

  it('does not truncate short usernames', () => {
    render(<OwnerProjectLabel username="alice" name="Proj" />);
    expect(screen.getByText('alice')).toBeInTheDocument();
  });

  it('sets title attribute with full username/project', () => {
    render(<OwnerProjectLabel username="alice" name="My Project" />);
    const span = screen.getByTitle('alice / My Project');
    expect(span).toBeInTheDocument();
  });

  it('sets title with only project name when no username', () => {
    render(<OwnerProjectLabel username={null} name="My Project" />);
    const span = screen.getByTitle('My Project');
    expect(span).toBeInTheDocument();
  });
});
