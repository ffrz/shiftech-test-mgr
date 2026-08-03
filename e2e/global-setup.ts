import type { FullConfig } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Mint a real Supabase session for the E2E dummy user via the password grant
// (email provider is enabled on this project), then write it as Playwright
// storageState. This skips the Google OAuth UI entirely — no phone verification,
// no browser automation of Google's consent page.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? 'https://pgyuxtwzhflzujhrxixl.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBneXV4dHd6aGZsenVqaHJ4aXhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1NzM3MDUsImV4cCI6MjEwMDE0OTcwNX0.o-6gIqcD8VrApARAa-vDZDmKXDwCz30yloQs_7V-94M';
const DUMMY_EMAIL = process.env.E2E_DUMMY_EMAIL ?? 'e2e.dummy@testify.local';
const DUMMY_PASSWORD = process.env.E2E_DUMMY_PASSWORD ?? 'TestifyE2E#2026';

// supabase-js v2 stores the session JSON under this localStorage key.
const PROJECT_REF = new URL(SUPABASE_URL).hostname.split('.')[0];
const STORAGE_KEY = `sb-${PROJECT_REF}-auth-token`;

export default async function globalSetup(_config: FullConfig) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: DUMMY_EMAIL, password: DUMMY_PASSWORD }),
  });

  if (!res.ok) {
    throw new Error(`Failed to mint E2E session (${res.status}): ${await res.text()}`);
  }

  const session = await res.json();

  const state = {
    cookies: [],
    origins: [
      {
        origin: 'http://localhost:5173',
        localStorage: [{ name: STORAGE_KEY, value: JSON.stringify(session) }],
      },
    ],
  };

  const file = path.join(__dirname, '.auth', 'user.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(state, null, 2));
  console.log(`E2E session minted for ${session.user?.email ?? DUMMY_EMAIL}`);
}
