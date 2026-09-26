# Landing page waitlist

Public, no auth. `WaitlistForm` posts to `/api/waitlist`, which stores an email.

This is placeholder UI for the landing page, not a product feature. Check that the page renders and the form responds; don't report missing backend behavior (no rate limiting, no way to read the list back) as product gaps.

## Sub-features
- One form, in the hero (`WaitlistForm`): input `Email address` (sr-only label, placeholder `you@university.edu`), button `Join the waitlist` (`Joining…` while pending). The bottom CTA (`LandingBottomCTA`) and nav `Join waitlist` are `#waitlist` links that scroll to it.
- Bad email: the browser's `type="email"` check blocks submit; the API also rejects it with 400 `A valid email address is required`.
- A hidden honeypot input (`id="waitlist-website"`, label `Website`, off-screen and `aria-hidden`). If it has a value, the API returns the same 201 success without writing a row.
- Success text: "You're on the list. We'll be in touch with Kalend launch and access updates." A duplicate email also shows success and adds no row.

## How to get to it (user POV)
Visit `/` while signed out (signed in, `/` redirects to `/app`).

## Driving it with the browser pane
- The pane shares one cookie jar across tabs, so a signed-in pane always redirects `/` to `/app`. Signing out needs the user to sign back in; in an unattended run check the page without cookies instead: `curl -s localhost:<port>/` contains `id="waitlist-email"` and `Join the waitlist`, and `curl -s -X POST localhost:<port>/api/waitlist -H 'content-type: application/json' -d '{"email":"not-an-email"}'` returns the 400 above (writes nothing).
- Signed out: `find "Email address"` → click, type, click `Join the waitlist`, `find "You're on the list"`.
- There is no GET endpoint (GET returns 405); persistence can only be checked in the DB, so ask before inserting rows.

## Gotchas
- Leave the `Website` honeypot empty; filling it fakes success and writes nothing.
- Every submit with a new address writes a real row. Use `verify+<ts>@example.com` and tell the user it exists; there is no UI or API delete.
