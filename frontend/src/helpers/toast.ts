import type { Toast } from 'primereact/toast';

// Centralized toast helper backed by a single global <Toast> instance (see
// components/ui/AppToast.tsx, mounted once at the app root). Call sites use
// toastHelper.success/error/info/warn(...) directly — no ref plumbing, no risk of a
// dialog rendering its own nested toast on top of the page's. Compact size, monochrome
// black/white severity colors, and bottom-center position are enforced once in index.css
// (.p-toast rules) rather than per call site.
let toastRef: Toast | null = null;

// Assigned as the ref callback on the single <Toast> in AppToast.tsx.
export function setToastRef(instance: Toast | null) {
  toastRef = instance;
}

function show(severity: 'success' | 'error' | 'info' | 'warn', summary: string, detail?: string, life?: number) {
  toastRef?.show({ severity, summary, detail, life });
}

export const toastHelper = {
  success(summary: string, detail?: string, life?: number) {
    show('success', summary, detail, life);
  },
  error(summary: string, detail?: string, life?: number) {
    show('error', summary, detail, life);
  },
  info(summary: string, detail?: string, life?: number) {
    show('info', summary, detail, life);
  },
  warn(summary: string, detail?: string, life?: number) {
    show('warn', summary, detail, life);
  },
  // Convenience for the common "await X; catch show error" shape used across
  // detail pages (status change, assign, upload, ...).
  errorFromCatch(summary: string, err: unknown) {
    show('error', summary, err instanceof Error ? err.message : undefined);
  },
};
