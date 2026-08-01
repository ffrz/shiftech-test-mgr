import { useEffect, useId, useState } from 'react';
import { Tooltip } from 'primereact/tooltip';
import { formatDate, formatDateTime, formatRelativeTime } from '../../helpers/dateFormatter';

interface RelativeTimeProps {
  value: string;
  className?: string;
  prefix?: string;
  /** Days before falling back to an absolute date instead of relative text. Default 7 (GitHub/GitLab convention) — pass 0 to always show relative. */
  maxDays?: number;
}

const DEFAULT_MAX_DAYS = 7;

// Renders "5 minutes ago" / "3 days ago" within `maxDays` (default 7), then falls back to
// an absolute date (formatDate) beyond that — relative text stops being useful once it's
// "3 months ago". The absolute datetime is always in a PrimeReact Tooltip (instant on
// hover, unlike the native `title` attribute's built-in delay), so the exact time is one
// hover away either way. `.relative-time` (index.css) only underlines on hover so the
// tooltip affordance is felt, not just discovered by accident. Each instance gets its own
// Tooltip bound to a unique id (not a shared class target) since a page like ActivityPanel
// can render many of these at once. Re-renders every minute so long-lived pages don't go
// stale — interval is cleared/reset whenever `value` changes.
export function RelativeTime({ value, className, prefix, maxDays = DEFAULT_MAX_DAYS }: RelativeTimeProps) {
  const [, setTick] = useState(0);
  const id = `relative-time-${useId().replace(/:/g, '')}`;

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(interval);
  }, [value]);

  const ageDays = (Date.now() - new Date(value).getTime()) / (1000 * 60 * 60 * 24);
  const display = maxDays > 0 && ageDays >= maxDays ? formatDate(value) : formatRelativeTime(value);

  return (
    <>
      <Tooltip target={`#${id}`} showDelay={0} position="bottom" />
      <span id={id} className={['relative-time', className].filter(Boolean).join(' ')} data-pr-tooltip={formatDateTime(value)}>
        {prefix}{display}
      </span>
    </>
  );
}
