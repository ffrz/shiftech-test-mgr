import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownPreviewProps {
  value: string;
  emptyText?: string;
}

// Renders comment bodies as GitHub-flavored Markdown (tables, task lists, strikethrough,
// autolinks) — used by CommentEditor's Preview tab and by ActivityPanel to render saved
// comments. Links open in a new tab since markdown content can point off-app.
export function MarkdownPreview({ value, emptyText = 'Nothing to preview.' }: MarkdownPreviewProps) {
  if (!value.trim()) {
    return <p className="m-0 text-color-secondary text-sm italic">{emptyText}</p>;
  }

  return (
    <div className="markdown-preview text-sm">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Mention/test-case/issue links (see linkifyMentionsMarkdown) are relative
          // app routes — only external http(s) links open in a new tab.
          a: ({ href, ...props }) => {
            const isExternal = /^https?:\/\//.test(href ?? '');
            return <a href={href} {...props} className="entity-link" target={isExternal ? '_blank' : undefined} rel={isExternal ? 'noreferrer' : undefined} />;
          },
        }}
      >
        {value}
      </ReactMarkdown>
    </div>
  );
}
