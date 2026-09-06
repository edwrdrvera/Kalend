# Landing page hand-off

This document is for whoever builds the real landing page into the app. It explains what to build, where the design lives, what routing has to change, and what NOT to build yet.

## Design source

The approved mockup is a two-page Claude Design canvas (not real app code):

https://claude.ai/code/artifact/af38159f-76ad-4c1d-afd3-5cb90f489983

- Page 1, "Landing Page": the actual design to implement.
- Page 2, "Brand Guide": color, type, and logo direction. Reference only, not something to build.

The canvas is built with inline styles and a raw Google Fonts `<link>` tag because it runs inside a sandboxed preview environment. That's a constraint of the design tool, not a pattern to copy. When you build the real page, reimplement it using this project's normal conventions: Tailwind classes, `shadcn/ui` components, `class-variance-authority` for variants. Copy the exact copy text and layout, not the raw HTML/CSS.

## What this page is

A public marketing/landing page for Kalend, replacing the calendar as what visitors see at `/`. Goal: explain the product and get a visitor to either sign up or log in. It is not the app itself and does not need to be wired to real data. All content on it (the calendar, the "Spaces" shown, the dates) is a static illustrative mockup.

## Routing changes

**Before:**
- `/` renders `<Calendar />`. It's a protected route. If you visit it while logged out, the middleware redirects you to `/login`.

**After:**
- `/` renders the new landing page. It's a public route. Logged-out visitors see it directly, no redirect.
- If a logged-in user visits `/`, redirect them to `/app`.
- `/app` renders what used to be at `/` (the `<Calendar />` component). Same protection as before: logged-out visitors get redirected to `/login`.

**Concretely:**
1. Move the current contents of `src/app/page.tsx` to `src/app/app/page.tsx`.
2. Write a new `src/app/page.tsx` with the landing page.
3. Update `src/lib/supabase/middleware.ts`:
   - Add `/` to the set of routes that don't require auth (it currently only allows `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/auth/callback`).
   - Add a redirect: if the user IS authenticated and requests `/`, send them to `/app`. This mirrors the existing rule that sends an authenticated user away from `/login` etc., just with a different destination.

**How to verify this part is done:**
- Logged out, visit `/`: you see the landing page, no redirect happens.
- Logged out, visit `/app`: you get redirected to `/login`.
- Logged in, visit `/`: you get redirected to `/app` and see the calendar.
- Logged in, visit `/app`: you see the calendar directly.
- `/login`, `/signup`, `/forgot-password`, `/reset-password` behave exactly as they do today.

## Page content (copy this text exactly)

**Nav:** "Kalend" wordmark on the left. "Log In" and "Get Started" buttons on the right ("Get Started" is the primary/filled button, "Log In" is secondary/outline).

**Hero:**
- Headline: "Hey, let's get your week sorted."
- Subtext: "Group deadlines, blockers, and reminders into Spaces — a class, a project, a job, anything with its own due dates. Then sync it all with Google or Apple Calendar."
- Two buttons: "Get Started" (primary), "Log In" (secondary)
- Small line under the buttons: "Syncs with Google & Apple Calendar" (with a small sync icon)
- Below that: a static mockup of the calendar. See "Calendar mockup content" below for exact sample data.

**Features (3-tile grid, one large tile on top, two smaller tiles below it):**
1. (large tile) "A Space for everything you're juggling" — "A class, a project, a job — each gets its own Space to hold deadlines, blockers, and reminders. Toggle its schedule off when you just want a clean calendar."
2. "Deadlines, prioritized" — "Tag what type it is, how urgent it is, and never lose track."
3. "Always in sync" — "Google or Apple Calendar — pick one, we'll keep it updated."

**Footer:** "Built by Edward Rivera" with a link to https://github.com/edwrdrvera

### Calendar mockup content

This is fake, illustrative data. It should look like a real month view but doesn't need to be wired to anything.

- A row of 4 "Space" filters above the calendar, shown as a colored dot plus label, not buttons: CS 201 (accent orange, shown as the active one), Thesis Project, Client Work, Weekend Shift.
- Month header: "September 2026" (matches when this design was made, doesn't need to be dynamic).
- A standard Mon-Sun month grid for September 2026. September 4, 2026 is marked as "today" (it was the actual current date when this was designed).
- 9 sample deadline chips scattered across the month, each a small solid-color rounded block: CS 201 (Sep 3), Essay Due (Sep 4, on the "today" cell), Study Grp (Sep 8), Math HW (Sep 11), Midterm (Sep 15), Lab Report (Sep 18), Client Call (Sep 22), Reading (Sep 25), Shift (Sep 29). Each has its own color from the category palette below.

## Visual identity

**Light theme.** This is a deliberate difference from the app itself, which is dark-themed by default (`className="dark"` in `src/app/layout.tsx`, daisyUI "business" theme). The landing page needs to render in light mode regardless of that. Check how the root layout forces dark mode and make sure the landing page route can override it, don't just let it inherit.

**Colors:**

| Token | Value | Use |
|---|---|---|
| Background | `#faf8f3` | Page background, warm off-white |
| Surface | `#ffffff` | Cards, the mockup panel |
| Border | `#e8e3d8` | Hairline borders |
| Ink (text) | `#1c1a16` | Primary text |
| Muted | `#756f61` | Secondary text |
| Primary Blue | `#2563eb` | Nav logo mark, links (matches the real app's existing accent color) |
| Accent Orange | `#f97316` (hover `#ea580c`) | Primary CTA button, "today" highlight, active filter |

Category colors (for the mockup's deadline chips, base + light tint used as the chip fill):

| Category | Base | Tint (chip background) |
|---|---|---|
| Blue | `#3b82f6` | `#dbeafe` |
| Green | `#22c55e` | `#dcfce7` |
| Purple | `#a855f7` | `#f3e8ff` |
| Orange | `#f97316` | `#ffedd5` |
| Red | `#ef4444` | `#fee2e2` |
| Indigo | `#6366f1` | `#e0e7ff` |
| Pink | `#ec4899` | `#fce7f3` |
| Yellow | `#eab308` | `#fef9c3` |
| Teal | `#14b8a6` | `#ccfbf1` |

Feature tile colors: mint `#8fd8c8`, mustard `#f0c05a`, coral `#f2836b`. Text on these tiles is dark (`#171310`), not white.

**Typography:** One family, Plus Jakarta Sans, weights 400/500/600/700/800. Hierarchy comes from weight and size, not from mixing fonts. Use `next/font/google` to load it rather than a stylesheet `<link>` tag, that's the Next.js-native way and avoids the layout-shift issues a raw link can cause.

**Corners:** Buttons and calendar cells use a 10px radius, chips 6px, the feature tiles 18px, the calendar mockup card 16px. Keep this fairly restrained, tighter than the app's default rounding in a few places, that's intentional, it's part of the calmer feel this design is going for.

**Spacing:** Content is centered in a 1200px max-width container. Generous vertical padding, especially around the hero and features sections, this page is meant to feel airy, not dense.

**Animation:** Hero elements (headline, subtext, buttons, sync line, calendar mockup) fade up and in on load, staggered slightly (roughly 0.1s apart). Subtle, not flashy.

**Responsive:**
- Below 860px: nav and hero padding shrink, the CTA buttons stack full-width instead of sitting side by side.
- Below 640px: the 3-tile feature grid stacks to one column, calendar cells shrink and chip text hides (leaving just the color block visible), weekday labels shrink.

## What NOT to build yet

The copy on this page describes product ideas that are not implemented. Don't create new database tables, schema changes, or API routes because of this landing page.

- **"Spaces"** as a concept (a container for a class, project, or job holding its own deadlines) does not exist in the app's data model yet. The app currently has a "Category" concept (`CategoryManager`, `CategorySelect`) that's related but not the same thing. See `CONTEXT.md` in the repo root for what's been resolved about this and what's still an open question.
- **Deadline subcategories, priority levels, and the Blocker/Reminder split** described in the feature copy are not built.
- **Calendar export to Google/Apple Calendar** is not built. This is flagged in the copy as a key selling point, so if this page ships to real users before that integration exists, flag it to product/design, they may want a "coming soon" treatment on that line instead of stating it as a current feature.

If any of the above becomes real product work later, it should go through its own design/planning pass, it's a genuine data model change, not something to bolt on while building this page.

## Open questions for later

- Whether "Space" replaces the existing "Category" concept in code, or sits above it as a new entity, is unresolved. Don't guess at this while building the landing page, it doesn't need an answer to ship the marketing page.
- Whether "Blocker" and "Reminder" are one category or two is also unresolved.
