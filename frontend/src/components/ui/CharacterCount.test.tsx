// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react';
import { describe, expect, it, afterEach } from 'vitest';
import { CharacterCount } from '../../components/ui/CharacterCount';

afterEach(() => {
  cleanup();
});

describe('CharacterCount', () => {
  it('shows current count and max', () => {
    render(<CharacterCount value="hello" maxLength={100} />);
    expect(screen.getByText('5 / 100')).toBeInTheDocument();
  });

  it('shows zero for empty string', () => {
    render(<CharacterCount value="" maxLength={200} />);
    expect(screen.getByText('0 / 200')).toBeInTheDocument();
  });

  it('updates when value changes', () => {
    const { rerender } = render(<CharacterCount value="a" maxLength={10} />);
    expect(screen.getByText('1 / 10')).toBeInTheDocument();
    rerender(<CharacterCount value="abcdef" maxLength={10} />);
    expect(screen.getByText('6 / 10')).toBeInTheDocument();
  });
});
