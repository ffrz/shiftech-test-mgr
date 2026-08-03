import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Navigate } from 'react-router-dom';
import { useAuthContext } from '../../hooks/useAuth';
import { APP_NAME } from '../../config/app';

export function LoginPage() {
  const { session, signInWithGoogle } = useAuthContext();

  if (session) return <Navigate to="/" replace />;

  return (
    <div className="flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
      <Card title={APP_NAME} className="w-20rem text-center">
        <p className="text-color-secondary mb-4">Sign in to manage Test Plans and Test Cases</p>
        <Button label="Sign in with Google" icon="pi pi-google" size="small" className="w-full" onClick={signInWithGoogle} />
      </Card>
    </div>
  );
}
