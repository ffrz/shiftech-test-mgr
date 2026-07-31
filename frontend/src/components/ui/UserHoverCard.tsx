import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { OverlayPanel } from 'primereact/overlaypanel';
import { Avatar } from 'primereact/avatar';
import { Tag } from 'primereact/tag';
import { Skeleton } from 'primereact/skeleton';
import { Button } from 'primereact/button';
import { useNavigate } from 'react-router-dom';
import { profileRepository } from '../../repositories/profileRepository';
import { queryKeys } from '../../hooks/queryKeys';

interface UserHoverCardProps {
  userId: string;
  // When provided, shows an Owner/Not the owner badge on the card (e.g. Test Suite author).
  isOwner?: boolean;
  children: React.ReactNode;
}

const OPEN_DELAY_MS = 300;
const CLOSE_DELAY_MS = 150;

// Hover-to-preview identity card (GitHub-style) for a username/avatar shown anywhere
// in the app — avatar, display name, username, and whether they own the entity being
// viewed. Hovering shows the card (after a short delay, so a mouse just passing over
// doesn't flash it); clicking navigates straight to the user's profile page instead of
// opening the card. Profile is resolved lazily, only once the card is about to show.
export function UserHoverCard({ userId, isOwner, children }: UserHoverCardProps) {
  const overlayRef = useRef<OverlayPanel>(null);
  const navigate = useNavigate();
  const [enabled, setEnabled] = useState(false);
  const openTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const { data: profile, isLoading } = useQuery({
    queryKey: queryKeys.profile(userId),
    queryFn: () => profileRepository.findById(userId),
    enabled,
  });

  function scheduleOpen(target: HTMLElement) {
    clearTimeout(closeTimer.current);
    clearTimeout(openTimer.current);
    openTimer.current = setTimeout(() => {
      setEnabled(true);
      overlayRef.current?.show(null, target);
    }, OPEN_DELAY_MS);
  }

  function scheduleClose() {
    clearTimeout(openTimer.current);
    closeTimer.current = setTimeout(() => overlayRef.current?.hide(), CLOSE_DELAY_MS);
  }

  function cancelClose() {
    clearTimeout(closeTimer.current);
  }

  return (
    <>
      <span
        className="cursor-pointer"
        onMouseEnter={(e) => scheduleOpen(e.currentTarget)}
        onMouseLeave={scheduleClose}
        onClick={async (e) => {
          e.stopPropagation();
          clearTimeout(openTimer.current);
          overlayRef.current?.hide();
          const username = profile?.username ?? (await profileRepository.findById(userId))?.username;
          if (username) navigate(`/@${username}`);
        }}
      >
        {children}
      </span>
      <OverlayPanel
        ref={overlayRef}
        showCloseIcon={false}
        className="user-hover-card"
        onMouseEnter={cancelClose}
        onMouseLeave={scheduleClose}
      >
        {isLoading ? (
          <div className="flex align-items-center gap-3" style={{ width: '260px' }}>
            <Skeleton shape="circle" size="3rem" />
            <div className="flex-1">
              <Skeleton width="8rem" className="mb-2" />
              <Skeleton width="6rem" />
            </div>
          </div>
        ) : profile ? (
          <div style={{ width: '260px' }}>
            <div className="flex align-items-center gap-3">
              <Avatar image={profile.avatarUrl ?? undefined} icon={profile.avatarUrl ? undefined : 'pi pi-user'} shape="circle" size="xlarge" />
              <div className="min-w-0">
                <div className="font-bold white-space-nowrap overflow-hidden text-overflow-ellipsis">
                  {profile.displayName || profile.username}
                </div>
                <div className="username-text text-sm">{profile.username}</div>
              </div>
            </div>
            {isOwner !== undefined && (
              <Tag
                className="mt-3"
                value={isOwner ? 'Owner' : 'Not the owner'}
                severity={isOwner ? 'success' : 'secondary'}
                icon={isOwner ? 'pi pi-star-fill' : undefined}
              />
            )}
            <Button
              label="View profile"
              icon="pi pi-external-link"
              text
              size="small"
              className="mt-3 p-0"
              onClick={() => {
                overlayRef.current?.hide();
                navigate(`/@${profile.username}`);
              }}
            />
          </div>
        ) : (
          <span className="text-color-secondary text-sm">User not found</span>
        )}
      </OverlayPanel>
    </>
  );
}
