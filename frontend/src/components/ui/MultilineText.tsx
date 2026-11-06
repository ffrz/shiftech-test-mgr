type MultilineTextProps = {
  value: string;
  className?: string;
};

/** Displays both real line breaks and escaped line-break text returned by imports. */
export function MultilineText({ value, className }: MultilineTextProps) {
  return (
    <span className={className} style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
      {value.replace(/\\r\\n|\\n|\\r/g, '\n')}
    </span>
  );
}
