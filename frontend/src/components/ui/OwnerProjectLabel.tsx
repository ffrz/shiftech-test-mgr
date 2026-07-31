const MAX_OWNER_LENGTH = 20;

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

interface OwnerProjectLabelProps {
  username?: string | null;
  name: string;
  maxOwnerLength?: number;
  className?: string;
}

// GitHub-style "username / project" label. The owner handle is hard-truncated at
// maxOwnerLength (default 20) characters, and both halves ellipsize via CSS so a
// long name can't blow out its container (sidebar, dashboard list).
export function OwnerProjectLabel({ username, name, maxOwnerLength = MAX_OWNER_LENGTH, className }: OwnerProjectLabelProps) {
  const owner = username ? truncate(username, maxOwnerLength) : null;
  return (
    <span className={`owner-project-label${className ? ` ${className}` : ''}`} title={username ? `${username} / ${name}` : name}>
      {owner && (
        <>
          <span className="owner-project-label-owner">{owner}</span>
          <span className="owner-project-label-sep"> / </span>
        </>
      )}
      <span className="owner-project-label-name">{name}</span>
    </span>
  );
}
