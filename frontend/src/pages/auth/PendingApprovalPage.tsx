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
      <Card title="Menunggu Persetujuan" className="w-25rem text-center">
        <p className="text-color-secondary mb-2">
          Akun <strong>{profile?.email}</strong> berhasil masuk, tapi belum disetujui administrator.
        </p>
        <p className="text-color-secondary mb-4">Hubungi admin untuk mendapatkan akses.</p>
        <Button label="Keluar" icon="pi pi-sign-out" severity="secondary" outlined className="w-full" onClick={signOut} />
      </Card>
    </div>
  );
}
