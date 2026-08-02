// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MarkdownPreview } from './MarkdownPreview';

describe('MarkdownPreview', () => {
  it('renders empty text for blank input', () => {
    render(<MarkdownPreview value="   " />);
    expect(screen.getByText('Nothing to preview.')).toBeInTheDocument();
  });

  it('renders a custom empty text', () => {
    render(<MarkdownPreview value="" emptyText="Tidak ada konten." />);
    expect(screen.getByText('Tidak ada konten.')).toBeInTheDocument();
  });

  it('renders bold markdown', () => {
    render(<MarkdownPreview value="**important**" />);
    expect(screen.getByText('important', { selector: 'strong' })).toBeInTheDocument();
  });

  it('renders inline code', () => {
    render(<MarkdownPreview value="run `npm test`" />);
    expect(screen.getByText('npm test', { selector: 'code' })).toBeInTheDocument();
  });

  it('opens external http(s) links in a new tab', () => {
    render(<MarkdownPreview value="[docs](https://example.com/a)" />);
    const link = screen.getByRole('link', { name: 'docs' });
    expect(link).toHaveAttribute('href', 'https://example.com/a');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });

  it('keeps relative app links in the same tab', () => {
    render(<MarkdownPreview value="[issue](/issues/1)" />);
    const link = screen.getByRole('link', { name: 'issue' });
    expect(link).toHaveAttribute('href', '/issues/1');
    expect(link).not.toHaveAttribute('target');
  });
});
