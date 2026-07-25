import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from 'primereact/card';
import { Avatar } from 'primereact/avatar';
import { profileService } from '../../services/profileService';
import type { Profile } from '../../types/domain';

export function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;
    profileService.getByUsername(username).then((p) => {
      setProfile(p);
      setLoading(false);
    });
  }, [username]);

  if (loading) return <p>Loading...</p>;
  if (!profile) return <p>User not found.</p>;

  const displayName = profile.displayName ?? profile.username;

  return (
    <div className="flex justify-content-center">
      <Card className="w-full md:w-6 lg:w-4">
        <div className="flex flex-column align-items-center text-center gap-3">
          <Avatar
            image={profile.avatarUrl ?? undefined}
            icon={profile.avatarUrl ? undefined : 'pi pi-user'}
            shape="circle"
            size="xlarge"
          />
          <h2 className="m-0">{displayName}</h2>
          {profile.displayName && (
            <p className="m-0 text-color-secondary">@{profile.username}</p>
          )}
          {profile.bio && <p className="m-0">{profile.bio}</p>}
        </div>
      </Card>
    </div>
  );
}
