// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { FilterToolbar } from '../../components/ui/FilterToolbar';

afterEach(() => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024, writable: true });
  cleanup();
});

function setMobileViewport() {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 500, writable: true });
  window.matchMedia = (query: string) =>
    ({
      matches: query.includes('max-width'),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

describe('FilterToolbar', () => {
  it('returns null when visible=false', () => {
    const { container } = render(
      <FilterToolbar visible={false}>
        <div>filters</div>
      </FilterToolbar>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders filter toggle button', () => {
    render(
      <FilterToolbar>
        <div>filters</div>
      </FilterToolbar>,
    );
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('shows children by default (defaultFilterVisible=true)', () => {
    render(
      <FilterToolbar>
        <div>Filter Fields</div>
      </FilterToolbar>,
    );
    expect(screen.getByText('Filter Fields')).toBeInTheDocument();
  });

  it('hides children when defaultFilterVisible=false', () => {
    render(
      <FilterToolbar defaultFilterVisible={false}>
        <div>Filter Fields</div>
      </FilterToolbar>,
    );
    expect(screen.queryByText('Filter Fields')).not.toBeInTheDocument();
  });

  it('toggles filter visibility on button click', () => {
    render(
      <FilterToolbar defaultFilterVisible={false}>
        <div>Filters</div>
      </FilterToolbar>,
    );
    expect(screen.queryByText('Filters')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Filters')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button'));
    expect(screen.queryByText('Filters')).not.toBeInTheDocument();
  });

  it('renders primary action', () => {
    render(
      <FilterToolbar primaryAction={<button>New Item</button>}>
        <div>filters</div>
      </FilterToolbar>,
    );
    expect(screen.getByText('New Item')).toBeInTheDocument();
  });

  it('renders secondary actions', () => {
    render(
      <FilterToolbar secondaryActions={<button>Import</button>}>
        <div>filters</div>
      </FilterToolbar>,
    );
    expect(screen.getByText('Import')).toBeInTheDocument();
  });

  it('uses parent-controlled filterVisible when provided', () => {
    render(
      <FilterToolbar filterVisible onToggleFilterVisible={vi.fn()}>
        <div>Always Visible</div>
      </FilterToolbar>,
    );
    expect(screen.getByText('Always Visible')).toBeInTheDocument();
  });

  it('calls onToggleFilterVisible in controlled mode', () => {
    const onToggle = vi.fn();
    render(
      <FilterToolbar filterVisible onToggleFilterVisible={onToggle}>
        <div>filters</div>
      </FilterToolbar>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it('starts collapsed on small screens even when defaultFilterVisible=true', () => {
    setMobileViewport();
    render(
      <FilterToolbar>
        <div>Filter Fields</div>
      </FilterToolbar>,
    );
    expect(screen.queryByText('Filter Fields')).not.toBeInTheDocument();
  });

  it('reports initial collapsed visibility via onVisibilityChange on small screens, then the toggle opening it', () => {
    setMobileViewport();
    const onVisibilityChange = vi.fn();
    render(
      <FilterToolbar onVisibilityChange={onVisibilityChange}>
        <div>Filter Fields</div>
      </FilterToolbar>,
    );
    expect(onVisibilityChange).toHaveBeenLastCalledWith(false);
    fireEvent.click(screen.getByRole('button'));
    expect(onVisibilityChange).toHaveBeenLastCalledWith(true);
    expect(screen.getByText('Filter Fields')).toBeInTheDocument();
  });
});
