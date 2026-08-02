// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import SearchInput from '../../components/ui/SearchInput';

afterEach(() => {
  cleanup();
});

describe('SearchInput', () => {
  describe('inline mode (default)', () => {
    it('renders with placeholder', () => {
      render(<SearchInput value="" onChange={vi.fn()} />);
      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });

    it('renders with custom placeholder', () => {
      render(<SearchInput value="" onChange={vi.fn()} placeholder="Find..." />);
      expect(screen.getByPlaceholderText('Find...')).toBeInTheDocument();
    });

    it('calls onChange when value changes', () => {
      const onChange = vi.fn();
      render(<SearchInput value="" onChange={onChange} />);
      fireEvent.change(screen.getByPlaceholderText('Search...'), { target: { value: 'test' } });
      expect(onChange).toHaveBeenCalledWith('test');
    });

    it('shows clear icon when value is not empty', () => {
      const { container } = render(<SearchInput value="test" onChange={vi.fn()} />);
      expect(container.querySelector('.pi-times')).toBeTruthy();
    });

    it('does not show clear icon when value is empty', () => {
      const { container } = render(<SearchInput value="" onChange={vi.fn()} />);
      expect(container.querySelector('.pi-times')).toBeFalsy();
    });

    it('clears value when clear icon is clicked', () => {
      const onChange = vi.fn();
      const { container } = render(<SearchInput value="test" onChange={onChange} />);
      fireEvent.click(container.querySelector('.pi-times')!);
      expect(onChange).toHaveBeenCalledWith('');
    });
  });

  describe('floating mode', () => {
    it('renders with label when floating=true', () => {
      render(<SearchInput value="" onChange={vi.fn()} floating label="Filter" />);
      expect(screen.getByText('Filter')).toBeInTheDocument();
    });

    it('renders without clear icon in floating mode', () => {
      const { container } = render(<SearchInput value="test" onChange={vi.fn()} floating />);
      expect(container.querySelector('.pi-times')).toBeFalsy();
    });
  });
});
