// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react';
import { describe, expect, it, afterEach } from 'vitest';
import { PageHeader } from '../../components/ui/PageHeader';

afterEach(() => {
  cleanup();
});

describe('PageHeader', () => {
  it('renders the title', () => {
    render(<PageHeader title="Test Plans" />);
    expect(screen.getByText('Test Plans')).toBeInTheDocument();
  });

  it('renders actions when provided', () => {
    render(<PageHeader title="Page" actions={<button>New</button>} />);
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('renders without actions', () => {
    render(<PageHeader title="Page" />);
    expect(screen.getByText('Page')).toBeInTheDocument();
  });

  it('renders title as h2', () => {
    render(<PageHeader title="Title" />);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent('Title');
  });
});
