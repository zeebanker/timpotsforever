# Timpots Forever

Static site for the Timpany School alumni community.
Live at **https://timpotsforever.org** (Cloudflare Pages, auto-deploys on every push to `main`).

GitHub: `zeebanker/timpotsforever`. Default branch `main`.

## Architecture

Two patterns coexist:

1. **Modular homepage** — `index.html` carries ALL CSS plus a JavaScript section loader. Content lives in:
   - `sections/static/` — masthead, nav, footer (rarely change)
   - `sections/dynamic/` — jazz, hero, stories, newsletter-callout, directory-events, history, give, social (updated often)

   Loader fetches each section's HTML via `fetch()` and injects it into a placeholder `<div>`. Sections are pure HTML fragments — no `<html>`, `<head>`, `<style>`, or `<script>` tags. After all sections load, the loader dispatches `document.dispatchEvent(new CustomEvent('sectionsLoaded'))` for downstream listeners.

2. **Standalone pages** — `login.html`, `members.html`, `profile.html`, `map.html`. Each carries its own inline CSS (matching the brand vars) and uses the `.members-header` pattern: a thin garnet bar with title + right-side action icons (home, user-affordance, logout). These pages don't go through the section loader. To trigger auth.js's user-affordance update on these pages, dispatch the `sectionsLoaded` event manually after DOMContentLoaded.

**Local dev**: must be served over HTTP (`file://` breaks `fetch()`):

```
python3 -m http.server 8000
```

Then visit `http://localhost:8000`. Hard-refresh (Cmd+Shift+R) after edits.

## Services & data

| | What | Where |
|---|---|---|
| **Auth** | Supabase Auth | `js/supabase-config.js` (publishable key, NOT service_role). Three scripts cooperate: `supabase-config.js` initializes the client and **overwrites `window.supabase`** with the client instance; `auth.js` handles login/signup + UI sync; `protect.js` gates protected pages. |
| **Database** | Supabase Postgres | See "Database schema" below. |
| **Outbound email** | Resend (custom SMTP plugged into Supabase Auth) | All 4 auth email templates (Confirm Signup, Reset Password, Magic Link, Change Email) are branded with garnet header + gold accents, send from `Timpots Forever <hello@timpotsforever.org>`. |
| **Inbound email** | Cloudflare Email Routing | `hello@`, `admin@`, `support@`, `newsletter@` forward to the owner's Yahoo inbox. |

## Database schema

**Enums:**
- `timpany_grade`: `Pre-KG, KG, 1..9, ICSE, 11, ISC` (14 values, ordered). UI displays `ICSE` as "10/ICSE" and `ISC` as "12/ISC" — DB values stay as `ICSE`/`ISC`.
- `timpany_house`: `pluto, mercury, jupiter, neptune`. UI labels: "Pluto / Venus", "Mercury", "Jupiter", "Neptune".

**Tables:**
- `profiles` — 1:1 with `auth.users` (via `id` FK). Stores name fields, tenure (beginning/ending grade + year), house, location (city, country, lat, lon), contact, web, bio, visibility (`public`/`members`/`private`, default `members`), soft-delete. Auto-created by trigger on signup.
- `attendance_records` — composite PK `(profile_id, year)`. Stores grade, section, class_teacher. Auto-populated by trigger when `beginning_year`/`ending_year` are set; rows outside the range are deleted automatically.

**View:**
- `public_alumni_map` — anon-readable, exposes only `first_name, last_initial, house, latitude, longitude, city, country`. Powers the map page.

**RLS**: users always read own profile; members read others' if `visibility IN ('public','members')`; anyone reads `public`. Users write own profile/attendance only.

## Pages

| File | Purpose | Key features |
|---|---|---|
| `index.html` | Public homepage | Modular section loader; hosts ALL site CSS. |
| `login.html` | Sign in / sign up / forgot password | Tabbed UI; 3 password fields with eye-toggle. |
| `members.html` | Protected dashboard | Quick-link cards. Loads `protect.js` to gate. |
| `profile.html` | Alumni profile editor | Single Save button (saves profile + attendance together). Inline Account & security card with password change. Live attendance table that re-renders as you change years. Auto-fills Standard column based on beginning Standard math. |
| `map.html` | Public alumni map | Reads `public_alumni_map`. Leaflet + markercluster + Natural Earth borders + Seek Truth logo overlay at Vizag. Popup shows name + city/country + house. Cluster click capped at zoom 6. |

## Design system

- **Fonts**: Playfair Display (display/serif) + Source Sans 3 (sans). Loaded via Google Fonts at the top of `index.html`. Include italic variants (`ital,wght@0,400;0,600;0,700;1,400;1,500;1,700`) — the masthead's `<em>` italic styling depends on real italic glyphs, not faux-italic.
- **Brand colors** (CSS vars in `:root` at the top of each page that needs them):
  - `--brand: #7a1420` (deep garnet)
  - `--gold: #b5894a` (muted bronze; use on light backgrounds)
  - `--gold-bright: #f0c579` (bright gold; use on dark/garnet backgrounds)
- **Tagline**: "Seek Truth"

## Conventions

- **Logos and photos**: use `<img src="images/...">` or CSS `mask`, not inline `<svg>`. Inline `<svg>` without explicit width/height renders inconsistently between Chrome (giant default) and Safari (collapsed).
- **All homepage CSS** lives in `index.html`. Section files are pure HTML fragments.
- **Standalone pages** inline their own CSS — they don't share index.html's stylesheet (no link to it).
- **Password eye-toggle** is implemented once in `js/auth.js` via event delegation. Any page that loads `auth.js` and wraps a `<input type="password">` in `<div class="password-wrap">` with a `<button class="password-toggle" data-target="input-id">…</button>` gets the toggle for free.
- **Protected nav links** in the modular nav use `class="protected-link" data-dest="…"`. A delegated handler in `index.html` checks for a Supabase session on click and redirects to login if not signed in.
- **DB column order in views** — Postgres won't let `CREATE OR REPLACE VIEW` reorder existing columns; only append at the end. If you need to reshape a view, drop and recreate (data is in tables, not views).

## Asset sources (outside the repo)

The repo sits inside `/Users/admin/Dropbox orignal/Personal/KP's Stuff/Timpots90/Timpots Forever/`. Sibling folders:

- `Logo/` — source files. Active logo is `images/logo.png` (cropped from `Logo/seektruth_gemini.png` with inverse-brightness alpha — pure black silhouette on transparent, recolorable via `background-color` or CSS mask).
- `Jazz/` — Dr. Mercy Jeyaraja Rao photos and videos. The portrait at `images/jazz.jpg` was cropped from `PHOTO-2026-04-02-07-22-50.jpg` (a memorial poster, text-region cropped out).

## Stale stuff to ignore

- `prototypes/map.html` — original map prototype with mock 500 alumni. SUPERSEDED by `map.html` at the repo root. Don't edit; left for historical reference.
- `~/Downloads/timpotsforever/` — original monolithic copy of the site. Stale. The GitHub repo is the source of truth.

## Phase 2 ideas (not yet built)

- **Alumni directory list view** — searchable list (by name / year / house / city) for logged-in members. Companion to the map. Schema supports it; needs UI.
- **Photo gallery** — needs Cloudflare R2 storage (Supabase free tier's 1 GB is too tight).
- **Forum / discussions** — new tables (threads, posts), moderation rules.
- **Newsletter archives** — links to issues stored in R2 or as a simple list.
- **Admin panel** — manage users, moderate content, view analytics.
