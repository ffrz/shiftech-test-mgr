import type { RefObject } from 'react';
import type { Toast } from 'primereact/toast';

// Centralized toast helper — every call site should go through these instead of calling
// toast.current.show(...) directly, so summary/detail wording stays terse and consistent
// and severity defaults (e.g. life) don't drift between pages. The compact size/position
// ("bottom-center", small text) is already enforced globally via .p-toast rules in
// index.css and the <Toast position="bottom-center" /> convention — this helper only
// standardizes the payload, not layout.
type ToastRef = RefObject<Toast | null>;

function show(toastRef: ToastRef, severity: 'success' | 'error' | 'info' | 'warn', summary: string, detail?: string) {
  toastRef.current?.show({ severity, summary, detail });
}

export const toastHelper = {
  success(toastRef: ToastRef, summary: string, detail?: string) {
    show(toastRef, 'success', summary, detail);
  },
  error(toastRef: ToastRef, summary: string, detail?: string) {
    show(toastRef, 'error', summary, detail);
  },
  info(toastRef: ToastRef, summary: string, detail?: string) {
    show(toastRef, 'info', summary, detail);
  },
  warn(toastRef: ToastRef, summary: string, detail?: string) {
    show(toastRef, 'warn', summary, detail);
  },
  // Convenience for the common "await X; catch show error" shape used across
  // detail pages (status change, assign, upload, ...).
  errorFromCatch(toastRef: ToastRef, summary: string, err: unknown) {
    show(toastRef, 'error', summary, err instanceof Error ? err.message : undefined);
  },
};
