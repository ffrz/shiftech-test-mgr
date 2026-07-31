import { useEffect, useRef, useState } from 'react';
import { InputText } from 'primereact/inputtext';
import { Card } from 'primereact/card';
import { InputTextarea } from 'primereact/inputtextarea';
import { CharacterCount } from '../../components/ui/CharacterCount';
import { Button } from 'primereact/button';
import { SelectButton } from 'primereact/selectbutton';
import { FloatLabel } from 'primereact/floatlabel';
import { PageHeader } from '../../components/ui/PageHeader';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { useSettings } from '../../hooks/useSettings';
import { useThemeContext, type ThemeMode } from '../../hooks/useTheme';
import { useAuthContext } from '../../hooks/useAuth';
import { userService } from '../../services/userService';
import { toastHelper } from '../../helpers/toast';

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
    try {
      await updateProfile({
        username: username.trim() || undefined,
        displayName: displayName.trim() || null,
        avatarUrl: avatarUrl.trim() || null,
        bio: bio.trim() || null,
      });
      toastHelper.success('Profile updated successfully.', undefined, 3000);
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
        <PageHeader title="Settings" />
        <p className="text-color-secondary">Loading profile...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="detail-content-col mx-auto">
      <Card>
        <PageHeader title="Settings" />
        <div className="card">
          <div className="flex flex-column gap-2">
            <div className="flex flex-column gap-1">
              <FloatLabel className="ifta-field">
                <InputText
                  id="username"
                  ref={usernameRef}
                  value={username}
                  disabled={profile.usernameChanged}
                  onChange={(e) => { setUsername(e.target.value); }}
                  className={error ? 'p-invalid w-full' : 'w-full'}
                />
                <label htmlFor="username" className={error ? 'p-error' : ''}>
                  Username *
                  {profile.usernameChanged && (
                    <span className="ml-2 text-xs text-color-secondary">(cannot be changed again)</span>
                  )}
                </label>
              </FloatLabel>
              <small className="text-color-secondary">
                {profile.usernameChanged
                  ? 'Username can only be changed once.'
                  : 'You can change your username only once.'}
              </small>
            </div>

            <div className="flex flex-column">
              <FloatLabel className="ifta-field">
                <InputText id="displayName" value={displayName} onChange={(e) => { setDisplayName(e.target.value); }} className="w-full" />
                <label htmlFor="displayName">Display Name</label>
              </FloatLabel>
            </div>

            <div className="flex flex-column">
              <FloatLabel className="ifta-field">
                <InputText id="avatarUrl" value={avatarUrl} onChange={(e) => { setAvatarUrl(e.target.value); }} className="w-full" />
                <label htmlFor="avatarUrl">Avatar URL (ex. https://example.com/avatar.jpg)</label>
              </FloatLabel>
            </div>

            <div className="flex flex-column gap-1">
              <FloatLabel className="ifta-field">
                <InputTextarea id="bio" value={bio} onChange={(e) => { setBio(e.target.value); }} rows={1} autoResize maxLength={1000} className="w-full" />
                <label htmlFor="bio">Bio</label>
              </FloatLabel>
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

      <Card title="Danger Zone" className="mt-3 detail-content-card detail-danger-zone">
        <div className="flex flex-column gap-2">
          <p className="m-0">
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
      </div>

      <ConfirmDialog />
    </div >
  );
}
