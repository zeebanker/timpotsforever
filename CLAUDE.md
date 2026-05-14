# Timpots Forever

Static site for the Timpany School alumni community.
Live at **https://timpotsforever.org** — auto-deploys on every push to `main` via Cloudflare Pages.

GitHub: `zeebanker/timpotsforever`. Default branch `main`. Owner commits via GitHub Desktop, not the CLI.

## Architecture

Two patterns coexist:

1. **Modular homepage** — `index.html` carries ALL CSS plus a JavaScript section loader. Content lives in:
   - `sections/static/` — masthead, nav, footer (rarely change)
   - `sections/dynamic/` — jazz, hero, stories, newsletter-callout, directory-events, history, give, social

   Loader fetches each section's HTML via `fetch()` and injects it into a placeholder `<div>` in `index.html`. Sections are pure HTML fragments (no `<html>` / `<head>` / `<style>` / `<script>`). After all sections load, the loader dispatches `document.dispatchEvent(new CustomEvent('sectionsLoaded'))` for downstream listeners.

2. **Standalone pages** — `login.html`, `profile.html`, `map.html`, `calendar.html`, `videos-photos.html`. Each carries its own inline CSS (matching the brand vars) and uses the `.members-header` class for the top bar pattern (garnet bar with title + right-side action icons). These pages don't go through the section loader. On standalone pages that load `auth.js`, dispatch `sectionsLoaded` manually after `DOMContentLoaded` to trigger the user-affordance UI sync.

**Local dev** must be served over HTTP (`file://` breaks `fetch()`):

```
python3 -m http.server 8000
```

Then `http://localhost:8000`. Hard-refresh (Cmd+Shift+R) after edits.

## Services & data

| | What | Where |
|---|---|---|
| **Auth** | Supabase Auth | `js/supabase-config.js` holds the **publishable** key (NOT service_role). Three scripts cooperate: `supabase-config.js` initializes the client and **overwrites `window.supabase`** with the client instance; `auth.js` handles login/signup + masthead UI + password eye-toggle; `protect.js` gates `profile.html` (and future protected pages). |
| **Database** | Supabase Postgres | See "Database schema" below. |
| **Outbound email** | Resend (custom SMTP plugged into Supabase Auth) | All 4 auth templates (Confirm Signup, Reset Password, Magic Link, Change Email) branded with garnet header + gold accents. Sent as `Timpots Forever <hello@timpotsforever.org>`. |
| **Inbound email** | Cloudflare Email Routing | `hello@`, `admin@`, `support@`, `newsletter@` forward to the owner's Yahoo inbox via a catch-all + explicit routes. |
| **Map data** | `public_alumni_map` view in Supabase | Anonymous SELECT; powers `map.html`. No login required. |

## Database schema

**Enums:**
- `timpany_grade`: `Pre-KG, KG, 1..9, ICSE, 11, ISC` (14 values, ordered). UI labels `ICSE` as "10/ICSE" and `ISC` as "12/ISC". DB values stay as `ICSE` / `ISC`.
- `timpany_house`: `pluto, mercury, jupiter, neptune, venus` (5 values). UI labels each as itself (Pluto, Venus, Mercury, Jupiter, Neptune). On the map, **Pluto and Venus share the red pin color** (via a `colorGroup` indirection) but each popup shows the user's actual house.

**Tables:**
- `profiles` — 1:1 with `auth.users` (via `id` FK). Fields: name parts, tenure (beginning/ending grade + year), house, location (city, country, lat, lon), phone, LinkedIn, personal URL, profession, bio, visibility, hide_phone, timestamps, soft-delete (`deleted_at`). Auto-created by trigger on signup.
- `attendance_records` — composite PK `(profile_id, year)`. Fields: grade, section, class_teacher. Auto-populated by trigger when a profile's `beginning_year` / `ending_year` change; rows outside the new range are deleted.

**View:**
- `public_alumni_map` — anon-readable. Exposes `first_name, last_initial, house, latitude, longitude, city, country`. **No visibility filter** — every alumnus with `lat/lon/house` set appears on the map regardless of `visibility`. The map is the public face; deeper info is gated below.

**Visibility model:**
- **Map-public fields** (always visible to anyone, even logged-out visitors): first_name, last_initial, house, city, country, lat, lon.
- **Visibility-gated fields** (gated by `profiles.visibility`): full `last_name`, preferred_name, tenure, contact (phone, login email), web URLs, profession, bio, attendance records.
- Visibility values offered in the UI: **members** (default — visible to logged-in alumni) and **private** (only the owner). The `'public'` enum value still exists for legacy reasons but is no longer surfaced as a choice in the UI; `profile.html` silently falls back to `members` if it sees a legacy `public` value.

**RLS on `profiles`:**
- Users always read their own profile.
- Members read others' profiles when `visibility IN ('members', 'public')`.
- Users write only their own profile / attendance records.

## Pages

| File | Public/private | Purpose |
|---|---|---|
| `index.html` | public | Modular homepage. Hosts ALL site CSS. |
| `login.html` | public | Tabbed sign-in / sign-up / forgot-password. All 3 password fields have an eye-toggle. |
| `profile.html` | session required (`protect.js`) | One-stop alumni profile editor. Single Save button covers profile + attendance. Account & security card includes password change with read-only login email. |
| `map.html` | public | Find Timpots map. Reads `public_alumni_map`. Leaflet + markercluster + Natural Earth borders + Seek Truth logo overlay at Vizag. Pins are house-colored (Pluto+Venus share red). Cluster click capped at zoom 6. Banner shows "N Timpots worldwide · counts by color group". |
| `calendar.html` | public | Hand-edited HTML event-card list (upcoming and past sections). Populate by copying an `.event-card`, editing the date / title / meta / body. Past events get the `.past` class to dim them; `<span class="event-tag">` adds a small label. |
| `videos-photos.html` | public | Placeholder "Coming soon" — future home for alumni photos + YouTube embeds. |

## Navigation (`sections/static/nav.html`)

Current items, in order: **Jazz · Newsletter · Memory Lane · School History · Find Timpots · Videos/Photos · Philanthropy · Calendar**.

Items previously here but removed:
- **Reunions & Events** — renamed to "Calendar" and made public (was previously a `protected-link`).
- **Alumni Directory** — temporarily removed. Will return as a separate `directory.html` page when built (members-only searchable list). See the build plan below.

**User-affordance icon top-right** (in `masthead.html` / standalone-page headers): when signed out, links to `login.html` with the outline user icon. When signed in, links to `profile.html` with a gold circle showing the user's first initial. State is updated by `auth.js` via the `sectionsLoaded` event and `onAuthStateChange`.

## Design system

**Fonts (REQUIRED across all pages):**
- **Headings (h1, h2, h3, h4)**: Playfair Display (serif) — bold, elegant, consistent with masthead
- **Body text**: Source Sans 3 (sans-serif) — clean, readable
- Load via Google Fonts: `ital,wght@0,400;0,600;0,700;1,400;1,500;1,700` (Playfair must include italic variants)

**Color Palette (use everywhere):**
- `--brand: #7a1420` (deep garnet) — primary/headings/accents
- `--gold: #b5894a` (muted bronze) — secondary/light backgrounds
- `--gold-bright: #f0c579` (bright gold) — accents on dark/garnet backgrounds
- `--ink: #1a1a1a` (black) — body text
- `--ink-soft: #555` (dark gray) — secondary text
- `--ink-muted: #888` (medium gray) — tertiary text
- `--bg: #fff` (white) — backgrounds
- `--bg-soft: #f7f4ee` (cream) — soft backgrounds
- `--rule: #e5e0d4` (light tan) — borders/dividers

**Design Standards (REQUIRED for all pages):**
1. **Every page must feel "high-end"** — match the aesthetic and polish of the landing page (`index.html`)
2. **Consistent styling** — use the same patterns, spacing, and visual hierarchy as the main site
3. **Typography hierarchy** — headings use Playfair, body uses Source Sans 3; maintain consistent sizing
4. **Spacing and padding** — use consistent whitespace; aim for breathing room like the homepage
5. **Component reuse** — buttons, cards, forms, headers should match landing page patterns
6. **Visual refinement** — subtle borders, shadows, hover states; no harsh edges or oversized elements

**Tagline**: "Seek Truth"

## Icons

**Philosophy**: Use clean line-style icons, not pictures or emojis. Create custom SVGs as needed.

- **Style**: Modern stroke-based icons (thin lines, consistent stroke width ~1.8–2px)
- **Colors**: Icons inherit `currentColor` for flexibility (brand color on light backgrounds, white on dark)
- **Sizing**: Explicit width/height on all SVG icons to prevent inconsistent rendering
- **Sources**: Hand-craft custom SVGs or use open-source sets (Feather Icons, Heroicons) for consistency

**Icons to update/create:**
- Portrait silhouettes (hero section, stories section) — replace filled gold avatars with line icons
- Category tags on Giving Back page — replace emoji with modern line icons
- Map icons — already modern; maintain current style

**Current icons (as of May 2026):**
- User icon (outline) — Sign-in button, headers (stroke SVG) ✓
- Home icon — On standalone page headers (emoji on newer pages, update to SVG)
- Map pins — Pushpin markers (SVG) ✓
- Hamburger menu — Mobile nav (SVG) ✓
- Category icons on Giving Back — Currently emoji, need modern line icons

## Conventions

- **Standalone pages** use the `.members-header` class for their top bar. The class name is historical (predates the `members.html` deletion) and now just identifies the shared pattern; it does not refer to any file.
- **Logos and photos**: prefer `<img src="images/...">` or CSS `mask`, not inline `<svg>`. Inline `<svg>` without explicit width/height renders inconsistently between Chrome (giant default) and Safari (collapsed).
- **All homepage CSS lives in `index.html`**. Section files in `sections/` are pure HTML fragments and reference existing CSS classes by name.
- **Password eye-toggle** is implemented once in `js/auth.js` via event delegation. Any page that loads `auth.js` and wraps a `<input type="password">` in `<div class="password-wrap">` with a `<button class="password-toggle" data-target="input-id">…</button>` gets the toggle for free.
- **Protected nav links** use `class="protected-link" data-dest="…"`. A delegated handler in `index.html` checks for a Supabase session on click and redirects to login if not signed in. Currently dormant (no nav items use it) — keep it ready for when the directory page is added.
- **Postgres view column order**: `CREATE OR REPLACE VIEW` cannot reorder existing columns — only append at the end. If a view needs reshaping beyond appending, drop and recreate it.
- **Map house data flow**: `HOUSES` maps each of the 5 enum values to a `colorGroup` (Pluto + Venus → `red`; Mercury → `yellow`; Jupiter → `blue`; Neptune → `green`). `COLOR_GROUPS` holds the visuals (gradient ID, mid/dark hex). Pin SVGs, cluster donut wedges, and banner counts all use the color group; popups use the actual house label.

## Critical gotchas

1. **Don't change `window.supabase = ...` back to `const supabase = ...`** in `js/supabase-config.js`. The Supabase CDN script declares a global `supabase`; redeclaring with `const` throws "Can't create duplicate variable: 'supabase'" and breaks everything downstream.

2. **Section loader is async**. Code that needs masthead/nav DOM must wait for the `sectionsLoaded` custom event dispatched at the end of `loadAllSections()` in `index.html`. Don't bind to `DOMContentLoaded` for that on the homepage — sections aren't injected yet. Standalone pages should dispatch the event themselves after `DOMContentLoaded`.

3. **Inline `<svg>` with no width/height** renders inconsistently between Chrome (giant) and Safari (collapsed). Always use `<img>` or CSS mask with explicit dimensions.

4. **Markercluster needs explicit `maxZoom`** on `L.map()` because there's no tile layer. Without it, the plugin throws `"Map has no maxZoom specified"` as a bare string that's hard to debug. `map.html` sets `{ maxZoom: 18 }`.

5. **Cluster click is overridden in `map.html`** to cap zoom at level 6 (then spiderfy on the next click). The default `zoomToBoundsOnClick` would zoom to street level when pins are tightly packed at the same city.

6. **Supabase Auth URL Configuration**: redirect-URL whitelist must include the post-confirmation page. Currently should include `https://timpotsforever.org/profile.html` (was `/members.html` historically — update if not already done).

## Asset sources (outside the repo)

Repo sits inside `/Users/admin/Dropbox orignal/Personal/KP's Stuff/Timpots90/Timpots Forever/`. Sibling folders:

- `Logo/` — source files. Active logo is `images/logo.png` (cropped from `Logo/seektruth_gemini.png` with inverse-brightness alpha — pure black silhouette on transparent, recolorable via `background-color` or CSS mask).
- `Jazz/` — Dr. Mercy Jeyaraja Rao photos and videos. Portrait at `images/jazz.jpg` was cropped from `PHOTO-2026-04-02-07-22-50.jpg`.

## Stale stuff to ignore

- `prototypes/map.html` — original map prototype with mock 500 alumni. SUPERSEDED by `map.html` at the repo root. Don't edit.
- `~/Downloads/timpotsforever/` — original monolithic copy of the site. Stale. GitHub repo is the source of truth.

---

# Build plan: Alumni Directory

A members-only searchable list of profiles, companion to the map. Where the map answers "who's in this city?", the directory answers "who's in the class of '90?" or "how do I find Madhavi from school?". The schema and RLS already support it; this is purely a new page + a nav link.

## What you're building

A new standalone page `directory.html` following the same conventions as `profile.html` and `map.html`:

```
┌────────────────────────────────────────────────────────┐
│  Timpots Forever — Alumni Directory   🏠   👤          │  ← .members-header
├────────────────────────────────────────────────────────┤
│  [Search by name…]                                     │
│  House:[Any▾]  Left in:[Any year▾]  Sort:[A→Z▾] 42 found│
│                                                        │
│  ┌─────────────────┐  ┌─────────────────┐              │
│  │ ⓐ Anand Reddy   │  │ ⓑ Bharath K.    │  ← .member  │
│  │   Mercury · '90 │  │   Pluto · '88   │     -card   │
│  │   Bengaluru, IN │  │   Houston, USA  │             │
│  │   Software eng. │  │   Doctor        │             │
│  └─────────────────┘  └─────────────────┘              │
│                                                        │
│  click a card → modal with full profile details        │
└────────────────────────────────────────────────────────┘
```

## File checklist

- **New**: `directory.html` (~400 lines, self-contained with inline CSS and JS).
- **Modified**: `sections/static/nav.html` — add `<a href="#" class="protected-link" data-dest="directory.html">Alumni Directory</a>`, ideally between "Find Timpots" and "Videos/Photos" (pairs the two discovery tools).
- **No schema changes needed** — `profiles` table, `attendance_records`, and RLS policies already cover everything.

## Page implementation

1. **Header bar**: same `.members-header` pattern. Title `Timpots Forever — Alumni Directory`. Right side: home icon + logout button (mirror `profile.html`).
2. **Auth gate**: include `<script src="js/protect.js"></script>` so non-members get bounced to login. The nav link is also a `protected-link` for UX, but `protect.js` is the actual guard.
3. **Filter / search bar**:
   - Text input (`#search`) — debounced ~250 ms.
   - House dropdown (`#filter-house`) — options: Any, Jupiter, Mercury, Neptune, Pluto, Venus (alphabetical, matching profile.html).
   - Left-in-year picker (`#filter-year`) — could be a year input, a decade dropdown, or a min/max pair.
   - Sort dropdown (`#sort`) — A→Z by last name, Z→A, recent leaving year first, oldest first.
   - Result count display (`X found`).
   - URL state: encode current filters as `?q=anand&house=mercury&year=1990` so links are shareable.
4. **Result grid**: `.member-card` elements in a CSS grid that collapses to single column on mobile. Card content:
   - Avatar circle (first initial, gold-on-garnet, like masthead user icon)
   - Full name (`first_name preferred_name (last_name)` or `first_name last_name`)
   - House label
   - "Left in 'YY" (e.g., "Left in '90")
   - "City, Country"
   - Profession line (one-liner)
5. **Detail modal**: clicking a card opens a modal with the full profile:
   - Header with avatar + full name + house badge
   - Tenure summary: `Pre-KG 1981 → ISC 1993` (computed from beginning/ending grade + year)
   - Location: city, country
   - Profession + bio paragraph
   - Contact: phone (if `hide_phone = false`); LinkedIn / personal URL buttons
   - Year-by-year attendance: table of `(year, grade, section, class_teacher)` from `attendance_records` for that user

## Data query pattern

The page queries `profiles` directly — not `public_alumni_map` — so it can pull the full set of visibility-gated fields. RLS keeps the data safe:

```js
let q = supabase
  .from('profiles')
  .select(`
    id, first_name, last_name, preferred_name,
    beginning_grade, beginning_year, ending_grade, ending_year,
    house, city, country,
    phone, hide_phone, linkedin_url, personal_url,
    profession, bio,
    visibility
  `)
  .is('deleted_at', null);

// Search (full-text index on name fields already exists)
if (searchQuery) {
  q = q.or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,preferred_name.ilike.%${searchQuery}%`);
}
// Filters
if (filterHouse) q = q.eq('house', filterHouse);
if (filterYear)  q = q.eq('ending_year', filterYear);
// Sort
q = q.order(sortBy, { ascending: sortDir === 'asc' });
// Pagination (load first 30, expandable)
q = q.range(0, 29);

const { data, error } = await q;
```

RLS automatically filters out `visibility = 'private'` profiles for everyone except the owner. No client-side privacy logic needed for that.

## Attendance subquery

When the modal opens for a specific profile, fetch attendance separately:

```js
const { data: rows } = await supabase
  .from('attendance_records')
  .select('year, grade, section, class_teacher')
  .eq('profile_id', clickedProfileId)
  .order('year', { ascending: true });
```

## Privacy rules to enforce in the UI

The RLS policies handle most of this server-side, but a few things are client-side display rules:

- **Hide phone** if `hide_phone === true` on the modal (the field still loads via RLS, just don't render).
- **Self-row** always visible to the owner even if their `visibility = 'private'` — RLS handles this via `auth.uid() = id` policy.
- **Self-row in the list**: don't filter the owner's own card out; let them see themselves alongside everyone else.

## Pagination strategy

For a small alumni community (1k–2k users), three approaches work:

1. **Single page, no pagination** — load all visible profiles at once. Fine up to ~500 results. Simplest to build.
2. **"Load more" button** — initial 30 rows, click loads next 30. Easy to implement with `.range(start, end)`.
3. **Infinite scroll** — fancier, uses IntersectionObserver. Probably overkill.

Start with **#1** (no pagination); add `range()` later if loading becomes slow.

## Nav re-introduction

```html
<!-- in sections/static/nav.html, between Find Timpots and Videos/Photos -->
<a href="#" class="protected-link" data-dest="directory.html">Alumni Directory</a>
```

The dormant `protected-link` handler in `index.html` automatically picks it up — checks for a session on click and redirects to login if absent.

## Estimated time

~1.5 hrs for v1 (search + filter + grid + modal, single-page no pagination, all features above except photos). The schema is in place, the page pattern is established, and the existing `auth.js` user-affordance integration just works.

What could push it longer:
- Adding photos/avatars beyond the initial-circle (needs Cloudflare R2 storage setup).
- Co-attendance filter ("who was at Timpany the same years as me") — requires joining `attendance_records` with overlap logic.
- Iterating on the visual design beyond a first pass.

---

## Phase 2 (other features not yet built)

- **Photo gallery** — actual photos and YouTube embeds in `videos-photos.html`. Soft gate: anyone sees a teaser; signed-in members see the full archive. Needs Cloudflare R2 storage (Supabase free tier's 1 GB is too tight for many photos).
- **Forum / discussions** — new tables (threads, posts), moderation rules.
- **Newsletter archives** — list of issue links, stored in R2 or as a simple manifest.
- **Admin panel** — manage users, moderate content, view analytics.
