import { useEffect, useRef, useState } from 'react';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Button } from 'primereact/button';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { PageHeader } from '../../components/ui/PageHeader';
import { useSettings } from '../../hooks/useSettings';

export function SettingsPage() {
  const { profile, updateProfile, saving, error, clearError } = useSettings();

  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
  const [success, setSuccess] = useState(false);
  const usernameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (error && usernameRef.current) {
      usernameRef.current.focus();
      usernameRef.current.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    }
  }, [error]);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username);
      setDisplayName(profile.displayName ?? '');
      setAvatarUrl(profile.avatarUrl ?? '');
      setBio(profile.bio ?? '');
    }
  }, [profile]);

  async function handleSave() {
    clearError();
    setSuccess(false);
    try {
      await updateProfile({
        username: username.trim() || undefined,
        displayName: displayName.trim() || null,
        avatarUrl: avatarUrl.trim() || null,
        bio: bio.trim() || null,
      });
      setSuccess(true);
    } catch {
      // error is managed by the hook
    }
  }

  if (!profile) {
    return (
      <div>
        <Breadcrumb items={[{ label: 'Settings' }]} />
        <PageHeader title="Settings" />
        <p className="text-color-secondary">Loading profile...</p>
      </div>
    );
  }

  return (
    <div>
      <Breadcrumb items={[{ label: 'Settings' }]} />
      <PageHeader title="Settings" />
      <div className="card">
        <div className="flex flex-column gap-3" style={{ maxWidth: '32rem' }}>
          {success && <small className="p-text-secondary" style={{ color: 'var(--green-600)' }}>Profile updated successfully.</small>}

          <div className="flex flex-column gap-1">
            <label htmlFor="username" className={error ? 'p-error' : ''}>Username *</label>
            <InputText id="username" ref={usernameRef} value={username} onChange={(e) => { setUsername(e.target.value); setSuccess(false); }} className={error ? 'p-invalid' : ''} />
          </div>

          <div className="flex flex-column gap-1">
            <label htmlFor="displayName">Display Name</label>
            <InputText id="displayName" value={displayName} onChange={(e) => { setDisplayName(e.target.value); setSuccess(false); }} />
          </div>

          <div className="flex flex-column gap-1">
            <label htmlFor="avatarUrl">Avatar URL</label>
            <InputText id="avatarUrl" value={avatarUrl} onChange={(e) => { setAvatarUrl(e.target.value); setSuccess(false); }} placeholder="https://example.com/avatar.jpg" />
          </div>

          <div className="flex flex-column gap-1">
            <label htmlFor="bio">Bio</label>
            <InputTextarea id="bio" value={bio} onChange={(e) => { setBio(e.target.value); setSuccess(false); }} rows={4} />
          </div>

          {error && <small className="p-error">{error}</small>}
          <Button label="Save" icon="pi pi-check" loading={saving} onClick={handleSave} className="align-self-start" />
        </div>
      </div>
    </div>
  );
}
