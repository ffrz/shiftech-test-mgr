// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react';
import { describe, expect, it, afterEach } from 'vitest';
import { MarkdownPreview } from '../../components/ui/MarkdownPreview';

afterEach(() => {
  cleanup();
});

describe('MarkdownPreview', () => {
  it('shows empty text when value is empty', () => {
    render(<MarkdownPreview value="" />);
    expect(screen.getByText('Nothing to preview.')).toBeInTheDocument();
  });

  it('shows empty text when value is whitespace', () => {
    render(<MarkdownPreview value="   " />);
    expect(screen.getByText('Nothing to preview.')).toBeInTheDocument();
  });

  it('shows custom empty text', () => {
    render(<MarkdownPreview value="" emptyText="No content" />);
    expect(screen.getByText('No content')).toBeInTheDocument();
  });

  it('renders simple text', () => {
    render(<MarkdownPreview value="Hello world" />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders markdown bold', () => {
    render(<MarkdownPreview value="**bold text**" />);
    expect(screen.getByText('bold text')).toBeInTheDocument();
  });

  it('renders external links with target=_blank', () => {
    render(<MarkdownPreview value="[Google](https://google.com)" />);
    const link = screen.getByRole('link', { name: 'Google' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });

  it('renders relative links without target=_blank', () => {
    render(<MarkdownPreview value="[Issue](/issues/i-1)" />);
    const link = screen.getByRole('link', { name: 'Issue' });
    expect(link).not.toHaveAttribute('target');
    expect(link).not.toHaveAttribute('rel');
  });

  it('renders inline code', () => {
    const { container } = render(<MarkdownPreview value="use `code` here" />);
    expect(container.querySelector('code')).toBeTruthy();
  });
});
