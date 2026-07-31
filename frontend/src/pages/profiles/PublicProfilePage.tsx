import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { profileService } from '../../services/profileService';
import { projectService } from '../../services/projectService';
import { testSuiteService } from '../../services/testSuiteService';
import { ProfileView } from '../../components/profile/ProfileView';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { useAuthContext } from '../../hooks/useAuth';
import type { Profile, Project, TestSuite } from '../../types/domain';

export function PublicProfilePage() {
  const { usernameWithAt = '' } = useParams();
  const username = usernameWithAt.startsWith('@') ? usernameWithAt.slice(1) : '';
  const { profile: currentProfile, isAdmin } = useAuthContext();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [suites, setSuites] = useState<TestSuite[]>([]);
  const [loading, setLoading] = useState(true);

  const isOwnProfile = currentProfile?.username === username;
  const isSpying = isAdmin && !isOwnProfile;

  useEffect(() => {
    if (!username) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      const p = await profileService.getByUsername(username).catch(() => null);
      if (cancelled) return;
      setProfile(p);

      if (!p) {
        setLoading(false);
        return;
      }

      const visFilter = isOwnProfile ? undefined : ['public', 'unlisted'];
      const [proj, su] = await Promise.all([
        projectService.listByOwner(p.id, visFilter).catch(() => [] as Project[]),
        testSuiteService.listByOwner(p.id, visFilter).catch(() => [] as TestSuite[]),
      ]);
      if (cancelled) return;
      setProjects(proj);
      setSuites(su);
      setLoading(false);
    }

    load();

    return () => { cancelled = true; };
  }, [username, isOwnProfile]);

  if (loading) return <p>Loading...</p>;
  if (!profile) return <p>User not found.</p>;

  return (
    <div>
      {!isOwnProfile && <Breadcrumb items={[{ label: profile.username }]} />}
      <ProfileView profile={profile} projects={projects} suites={suites} isSpying={isSpying} />
    </div>
  );
}
