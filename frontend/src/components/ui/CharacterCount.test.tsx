// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CharacterCount } from './CharacterCount';

describe('CharacterCount', () => {
  it('renders current length and max length', () => {
    render(<CharacterCount value="hello" maxLength={140} />);
    expect(screen.getByText('5 / 140')).toBeInTheDocument();
  });

  it('renders zero length', () => {
    render(<CharacterCount value="" maxLength={10} />);
    expect(screen.getByText('0 / 10')).toBeInTheDocument();
  });

  it('renders a length exceeding the max (no clamping on its own)', () => {
    render(<CharacterCount value="way too long" maxLength={5} />);
    expect(screen.getByText('12 / 5')).toBeInTheDocument();
  });
});
