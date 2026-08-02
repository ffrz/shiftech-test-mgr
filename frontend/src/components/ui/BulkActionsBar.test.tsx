// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BulkActionsBar } from './BulkActionsBar';

describe('BulkActionsBar', () => {
  it('renders nothing when no rows are selected', () => {
    const { container } = render(<BulkActionsBar selectedCount={0} onClear={vi.fn()} actions={<button type="button">Delete</button>} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the selected count and cancel button when rows are selected', () => {
    render(<BulkActionsBar selectedCount={3} onClear={vi.fn()} actions={<button type="button">Delete</button>} />);
    expect(screen.getByText('3 selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('calls onClear when cancel is clicked', async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(<BulkActionsBar selectedCount={1} onClear={onClear} actions={<button type="button">Delete</button>} />);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
