// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { FilterToolbar } from './FilterToolbar';

describe('FilterToolbar', () => {
  it('renders children when filter is visible by default', () => {
    render(
      <FilterToolbar>
        <input aria-label="search" />
      </FilterToolbar>,
    );
    expect(screen.getByLabelText('search')).toBeInTheDocument();
  });

  it('hides children after toggling the filter off', async () => {
    const user = userEvent.setup();
    render(
      <FilterToolbar>
        <input aria-label="search" />
      </FilterToolbar>,
    );
    await user.click(screen.getByRole('button'));
    expect(screen.queryByLabelText('search')).not.toBeInTheDocument();
  });

  it('renders primary and secondary actions', () => {
    render(
      <FilterToolbar
        primaryAction={<button type="button">New Issue</button>}
        secondaryActions={<button type="button">Import</button>}
      >
        <div />
      </FilterToolbar>,
    );
    expect(screen.getByRole('button', { name: 'New Issue' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import' })).toBeInTheDocument();
  });

  it('renders nothing when visible=false', () => {
    const { container } = render(
      <FilterToolbar visible={false}>
        <input aria-label="search" />
      </FilterToolbar>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('supports controlled filterVisible + onToggleFilterVisible', async () => {
    const user = userEvent.setup();
    const onToggle = () => {};
    render(
      <FilterToolbar filterVisible onToggleFilterVisible={onToggle} defaultFilterVisible={false}>
        <input aria-label="search" />
      </FilterToolbar>,
    );
    expect(screen.getByLabelText('search')).toBeInTheDocument();
    await user.click(screen.getByRole('button'));
    // Controlled mode: parent owns state, component does not flip it internally.
    expect(screen.getByLabelText('search')).toBeInTheDocument();
  });
});
