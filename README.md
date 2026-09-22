# Bebaz Content OS

Standalone browser-based internal Content Team system for PhotoBebaz / Bebaz Inc.

## Stack
- React + Vite
- Supabase Auth + Postgres + Realtime
- GitHub
- Vercel

## Production backend
- Supabase project: `bebaz-content-os`
- Project ref: `ltqgbwomlhuyxxdmghih`
- Region: Singapore (`ap-southeast-1`)

## Access model
- One shared Content Team login email is fixed in the login screen.
- The password is **never stored in source code**.
- Team members enter the shared password in the browser and Supabase Auth verifies it.
- If the shared account does not yet exist, the first login attempt can bootstrap it using the password entered in the browser. The shared inbox may need to confirm the email once depending on Supabase Auth settings.
- PIC / Editor / Approver are operational names stored in `team_members`, not separate login accounts.

## Features
- Dashboard
- Content Plan
- Workflow Kanban
- Performance Tracker
- Insights
- PIC List
- Realtime sync across browsers
- CSV import/export
- No fake performance data

## Vercel
Import this GitHub repository in Vercel. Vercel should detect Vite automatically.

Build command:
```
npm run build
```

Output directory:
```
dist
```

The Supabase publishable key is client-safe and access is protected by RLS. Never commit a Supabase service-role key.
