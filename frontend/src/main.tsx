import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PrimeReactProvider } from 'primereact/api'

import 'primereact/resources/primereact.min.css'
import 'primeicons/primeicons.css'
import 'primeflex/primeflex.css'
import './index.css'

import App from './App.tsx'
import { AuthProvider } from './hooks/useAuth.tsx'
import { ThemeProvider } from './hooks/useTheme.tsx'
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 30s stale time: cheap navigation between pages/tabs within that window doesn't
      // refetch, but every mutation explicitly invalidates its query keys (see
      // hooks/queryKeys.ts) so an edit is reflected everywhere immediately regardless of
      // this window — this only governs the "nothing changed" case.
      staleTime: 30_000,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <PrimeReactProvider value={{ ripple: true, inputStyle: 'outlined', appendTo: document.body, autoZIndex: true }}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter basename="/app">
            <AuthProvider>
              <App />
            </AuthProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </PrimeReactProvider>
    </ThemeProvider>
  </StrictMode>,
)
