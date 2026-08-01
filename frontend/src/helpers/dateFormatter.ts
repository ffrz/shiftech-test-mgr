export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const RELATIVE_UNITS: { unit: Intl.RelativeTimeFormatUnit; seconds: number }[] = [
  { unit: 'year', seconds: 60 * 60 * 24 * 365 },
  { unit: 'month', seconds: 60 * 60 * 24 * 30 },
  { unit: 'week', seconds: 60 * 60 * 24 * 7 },
  { unit: 'day', seconds: 60 * 60 * 24 },
  { unit: 'hour', seconds: 60 * 60 },
  { unit: 'minute', seconds: 60 },
];

const relativeTimeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

// "5 minutes ago", "14 weeks ago", etc — falls back to "just now" under a minute, since
// Intl.RelativeTimeFormat has no unit smaller than minute that reads naturally here.
export function formatRelativeTime(isoString: string, now: Date = new Date()): string {
  const diffSeconds = (new Date(isoString).getTime() - now.getTime()) / 1000;
  const absSeconds = Math.abs(diffSeconds);

  if (absSeconds < 60) return 'just now';

  for (const { unit, seconds } of RELATIVE_UNITS) {
    if (absSeconds >= seconds) {
      const value = Math.round(diffSeconds / seconds);
      return relativeTimeFormatter.format(value, unit);
    }
  }
  return relativeTimeFormatter.format(Math.round(diffSeconds / 60), 'minute');
}
