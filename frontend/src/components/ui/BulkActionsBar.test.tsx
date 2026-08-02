// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { BulkActionsBar } from '../../components/ui/BulkActionsBar';

afterEach(() => {
  cleanup();
});

describe('BulkActionsBar', () => {
  it('returns null when selectedCount is 0', () => {
    const { container } = render(
      <BulkActionsBar selectedCount={0} onClear={vi.fn()} actions={<button>Delete</button>} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders when selectedCount > 0', () => {
    render(
      <BulkActionsBar selectedCount={3} onClear={vi.fn()} actions={<button>Delete</button>} />,
    );
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('shows the selected count', () => {
    render(
      <BulkActionsBar selectedCount={5} onClear={vi.fn()} actions={null} />,
    );
    expect(screen.getByText('5 selected')).toBeInTheDocument();
  });

  it('calls onClear when Cancel is clicked', () => {
    const onClear = vi.fn();
    render(
      <BulkActionsBar selectedCount={2} onClear={onClear} actions={null} />,
    );
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClear).toHaveBeenCalledOnce();
  });

  it('renders multiple action buttons', () => {
    render(
      <BulkActionsBar
        selectedCount={4}
        onClear={vi.fn()}
        actions={<><button>A</button><button>B</button></>}
      />,
    );
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });
});
