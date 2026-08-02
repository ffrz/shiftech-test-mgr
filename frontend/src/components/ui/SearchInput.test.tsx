// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SearchInput from './SearchInput';

describe('SearchInput', () => {
  it('calls onChange with the typed value', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SearchInput value="" onChange={onChange} />);
    await user.type(screen.getByPlaceholderText('Search...'), 'abc');
    expect(onChange).toHaveBeenCalledWith('a');
    expect(onChange).toHaveBeenCalledWith('b');
    expect(onChange).toHaveBeenCalledWith('c');
  });

  it('shows a clear button when a value exists and clears on click', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(<SearchInput value="query" onChange={onChange} />);
    const clearIcon = container.querySelector('.pi-times');
    expect(clearIcon).not.toBeNull();
    await user.click(clearIcon!);
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('does not render a clear button when value is empty', () => {
    const { container } = render(<SearchInput value="" onChange={vi.fn()} />);
    expect(container.querySelector('.pi-times')).toBeNull();
  });

  it('renders a floating label variant with the label text', () => {
    render(<SearchInput value="" onChange={vi.fn()} floating label="Cari" id="search-f" />);
    expect(screen.getByLabelText('Cari')).toBeInTheDocument();
  });
});
