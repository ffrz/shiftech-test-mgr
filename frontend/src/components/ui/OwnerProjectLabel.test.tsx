// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OwnerProjectLabel } from './OwnerProjectLabel';

describe('OwnerProjectLabel', () => {
  it('renders owner + project name when username is present', () => {
    render(<OwnerProjectLabel username="fahmi" name="Testify" />);
    expect(screen.getByText('fahmi')).toBeInTheDocument();
    expect(screen.getByText('Testify')).toBeInTheDocument();
    expect(screen.getByTitle('fahmi / Testify').textContent).toContain(' / ');
  });

  it('truncates long usernames at the default 20 chars', () => {
    render(<OwnerProjectLabel username="averyveryverylongusername_here" name="Proj" />);
    expect(screen.getByTitle('averyveryverylongusername_here / Proj')).toHaveTextContent('averyveryverylonguse…');
    expect(screen.queryByText('averyveryverylongusername_here')).not.toBeInTheDocument();
  });

  it('honors a custom max owner length', () => {
    render(<OwnerProjectLabel username="abcdefghij" name="Proj" maxOwnerLength={5} />);
    expect(screen.getByText('abcde…')).toBeInTheDocument();
  });

  it('does not truncate short usernames', () => {
    render(<OwnerProjectLabel username="ada" name="Proj" />);
    expect(screen.getByText('ada')).toBeInTheDocument();
  });

  it('renders only the project name when username is null', () => {
    render(<OwnerProjectLabel username={null} name="Standalone" />);
    expect(screen.getByText('Standalone')).toBeInTheDocument();
    expect(screen.queryByText(' / ')).not.toBeInTheDocument();
  });

  it('sets a title attribute combining owner and name', () => {
    render(<OwnerProjectLabel username="ada" name="Proj" />);
    expect(screen.getByTitle('ada / Proj')).toBeInTheDocument();
  });

  it('appends className', () => {
    render(<OwnerProjectLabel username="ada" name="Proj" className="extra" />);
    expect(screen.getByTitle('ada / Proj')).toHaveClass('owner-project-label', 'extra');
  });
});
