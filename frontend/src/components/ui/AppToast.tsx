import { Toast } from 'primereact/toast';
import { setToastRef } from '../../helpers/toast';

// Single global toast instance, mounted once at the app root (see App.tsx) — every call
// site reaches it through helpers/toast.ts instead of rendering its own <Toast ref>. One
// instance means one consistent stacking order/position/style, and no more nested toasts
// when a dialog (e.g. IssueEditor) used to render its own on top of the page's.
export function AppToast() {
  return <Toast ref={setToastRef} position="bottom-center" />;
}
