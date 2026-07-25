import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { useAuthContext } from '../../hooks/useAuth';

export function PendingApprovalPage() {
  const { profile, isApproved, signOut } = useAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (isApproved) navigate('/', { replace: true });
  }, [isApproved, navigate]);

  return (
    <div className="flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
      <Card title="Awaiting Approval" className="w-25rem text-center">
        <p className="text-color-secondary mb-2">
          Signed in as <strong>{profile?.email}</strong>, but not yet approved by an administrator.
        </p>
        <p className="text-color-secondary mb-4">Contact an admin to get access.</p>
        <Button label="Sign Out" icon="pi pi-sign-out" severity="secondary" outlined className="w-full" onClick={signOut} />
      </Card>
    </div>
  );
}
