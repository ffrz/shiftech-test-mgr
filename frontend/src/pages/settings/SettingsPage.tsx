import { useEffect, useRef, useState } from 'react';
import { InputText } from 'primereact/inputtext';
import { Card } from 'primereact/card';
import { InputTextarea } from 'primereact/inputtextarea';
import { CharacterCount } from '../../components/ui/CharacterCount';
import { Button } from 'primereact/button';
import { SelectButton } from 'primereact/selectbutton';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { PageHeader } from '../../components/ui/PageHeader';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { useSettings } from '../../hooks/useSettings';
import { useThemeContext, type ThemeMode } from '../../hooks/useTheme';
import { useAuthContext } from '../../hooks/useAuth';
import { userService } from '../../services/userService';

const THEME_OPTIONS: { label: string; value: ThemeMode }[] = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

export function SettingsPage() {
  const { profile, updateProfile, saving, error, clearError } = useSettings();
  const { mode, setMode } = useThemeContext();
  const { signOut } = useAuthContext();

  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
  const [success, setSuccess] = useState(false);
  const [deleting, setDeleting] = useState(false);
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

  function confirmDeleteAccount() {
    confirmDialog({
      message: 'This will permanently delete all your projects, test cases, test suites, and all associated data. Your contributions to other projects will be anonymised. This action cannot be undone.',
      header: 'Delete Account',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete My Account',
      rejectLabel: 'Cancel',
      acceptClassName: 'p-button-danger',
      rejectClassName: 'p-button-text',
      accept: async () => {
        setDeleting(true);
        try {
          await userService.deleteAccount();
          await signOut();
        } catch {
          setDeleting(false);
        }
      },
    });
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
      <Card style={{ maxWidth: 500 }}>
        <PageHeader title="Settings" />
        <div className="card">
          <div className="flex flex-column gap-3" style={{ maxWidth: '32rem' }}>
            {success && <small className="p-text-secondary" style={{ color: 'var(--green-600)' }}>Profile updated successfully.</small>}

            <div className="flex flex-column gap-1">
              <label htmlFor="username" className={error ? 'p-error' : ''}>
                Username *
                {profile.usernameChanged && (
                  <span className="ml-2 text-xs text-color-secondary">(cannot be changed again)</span>
                )}
              </label>
              <InputText
                id="username"
                ref={usernameRef}
                value={username}
                disabled={profile.usernameChanged}
                onChange={(e) => { setUsername(e.target.value); setSuccess(false); }}
                className={error ? 'p-invalid' : ''}
              />
              <small className="text-color-secondary">
                {profile.usernameChanged
                  ? 'Username can only be changed once.'
                  : 'You can change your username only once.'}
              </small>
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
              <InputTextarea id="bio" value={bio} onChange={(e) => { setBio(e.target.value); setSuccess(false); }} rows={1} autoResize maxLength={1000} />
              <CharacterCount value={bio} maxLength={1000} />
            </div>

            <div className="flex flex-column gap-2">
              <span className="text-sm font-medium">Theme</span>
              <SelectButton value={mode} options={THEME_OPTIONS} onChange={(e) => { if (e.value !== null) setMode(e.value); }} />

            </div>

            <div className="mb-2 mt-4">
              {error && <small className="p-error">{error}</small>}
              <Button label="Save" icon="pi pi-check" loading={saving} onClick={handleSave} className="align-self-start" />
            </div>
          </div>
        </div>
      </Card >

      <Card style={{ maxWidth: 500 }} className="mt-3">
        <div className="flex flex-column gap-2">
          <h3 className="m-0 text-red-500">Danger Zone</h3>
          <p className="m-0 text-sm text-color-secondary">
            Once you delete your account, all your projects, test cases, test suites,
            and associated data will be permanently removed. This cannot be undone.
          </p>
          <Button
            label="Delete Account"
            icon="pi pi-trash"
            severity="danger"
            loading={deleting}
            onClick={confirmDeleteAccount}
            className="align-self-start mt-2"
          />
        </div>
      </Card>

      <ConfirmDialog />
    </div >
  );
}
