// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('renders the title', () => {
    render(<PageHeader title="Projects" />);
    expect(screen.getByRole('heading', { name: 'Projects' })).toBeInTheDocument();
  });

  it('renders actions when provided', () => {
    render(<PageHeader title="Projects" actions={<button type="button">New Project</button>} />);
    expect(screen.getByRole('button', { name: 'New Project' })).toBeInTheDocument();
  });

  it('renders without actions', () => {
    const { container } = render(<PageHeader title="Projects" />);
    expect(container.querySelector('.header-actions')?.textContent).toBe('');
  });
});
