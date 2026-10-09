# src/app

Next.js App Router, split into two route groups with their own root layout (Next's "multiple root layouts" pattern — each has its own `<html>`/`<body>`, neither inherits from the other):

- `(marketing)/` — the deliberately light public experience: the landing page at `/` (`page.tsx` plus `src/components/landing/`) and `login/`, the only auth page (a thin route file rendering `AuthCard`). The landing page is static and illustrative only, not wired to real data; its CTA is `WaitlistForm` (posts to `/api/waitlist`), not a signup link — see the MVP note below.
- `(app)/` — the authenticated calendar experience: `app/page.tsx` is the calendar entry (a Server Component rendering the client `Calendar`) at `/app`, plus `error.tsx` and `loading.tsx`. Its `layout.tsx` is the dark root shell.

`globals.css`, `icon.svg`, and `api/` stay at the top level, shared by both groups.

See `api/CLAUDE.md` for Route Handler conventions.

## MVP: no signup, a demo account instead

This is a pre-launch MVP: there's no self-serve signup, password reset, or email confirmation. `/login` signs in to a single hardcoded demo Supabase Auth user (seeding it is documented in `src/db/CLAUDE.md`). Anyone else who wants in joins the waitlist on the landing page (`WaitlistForm` → `POST /api/waitlist`, which just stores an email, no account created). Revisit this once there's real demand to justify building account creation properly.

## Auth & routing

`src/proxy.ts` delegates to `updateSession()` in `@/lib/supabase/middleware`, which refreshes the Supabase session and redirects (unauthenticated visiting anything other than `/` or `/login` → `/login`; authenticated visiting `/` or `/login` → `/app`). Its matcher excludes static assets, `api/ping`, and `api/waitlist` (public, unauthenticated). A new public route has to be added to the public-route allowance in `updateSession`, not just to the matcher.

## Styling (`globals.css`)

Tailwind v4 with `shadcn/tailwind.css` and the kalend-ui tokens. Theme colors are CSS variables mapped in the `@theme inline` block. Change a color by editing the variable, not by hardcoding a hex value in a component.
