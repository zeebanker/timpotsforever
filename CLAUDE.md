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
| **Form submissions** | Formspree (form ID `xgodbgkw`) | "Suggest a Cause" form on `giving-back.html` posts via AJAX `fetch()` with `Accept: application/json` header — Formspree returns 200 JSON on success, never redirecting users to Formspree's bland thank-you page. The page swaps the form for a branded in-page thank-you state with a checkmark icon, italic "Thank *you*" heading, and a "Submit another" reset link. Graceful degradation: if JS is disabled, the regular form-POST action takes over and Formspree handles the redirect. |
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
| `map.html` | public | Timpots Worldwide map. Reads `public_alumni_map`. Leaflet + markercluster + Natural Earth borders + Seek Truth logo overlay at Vizag. Pins are house-colored (Pluto+Venus share red). Cluster click capped at zoom 6. Banner shows "N Timpots worldwide · counts by color group". |
| `calendar.html` | public | Hand-edited HTML event-card list (upcoming and past sections). Populate by copying an `.event-card`, editing the date / title / meta / body. Past events get the `.past` class to dim them; `<span class="event-tag">` adds a small label. |
| `videos-photos.html` | public | Placeholder "Coming soon" — future home for alumni photos + YouTube embeds. |
| `directory.html` | session required (`protect.js`) | Members-only searchable alumni directory. Searches by name, filters by year-at-school + house, sorts by surname or leaving year. Cards open a modal with full profile + year-by-year attendance. Reads `profiles` + `attendance_records` directly; RLS enforces visibility. |

## Navigation (`sections/static/nav.html`)

Current items, in order: **Jazz · Newsletter · Memory Lane · School History · Famous Timpots · Timpots Worldwide · Alumni Directory · Giving Back · Videos/Photos · Calendar**.

"Alumni Directory" is the only `protected-link` nav item — the delegated handler in `index.html` (registered on `document`) redirects logged-out visitors to `login.html`. Paired next to "Timpots Worldwide" because the two are companion discovery tools (map = where; directory = who).

Items previously here but removed:
- **Reunions & Events** — renamed to "Calendar" and made public (was previously a `protected-link`).

**Map page is named "Timpots Worldwide" everywhere** — nav link, `<title>`, page header, and overlay all match. Earlier copy used "Find Timpots"; all references migrated.

**User-affordance icon top-right** — present on every standalone page header (`masthead.html` + all standalone `.members-header`). When signed out, links to `login.html` with the outline user icon. When signed in, links to `profile.html` with a gold circle showing the user's first initial. State is updated by `auth.js` via the `sectionsLoaded` event and `onAuthStateChange`. **Every standalone page must load `js/supabase-config.js` + `js/auth.js` and dispatch `sectionsLoaded` after `DOMContentLoaded`** for the affordance to render correctly.

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
7. **No dark text on dark backgrounds** — ensure sufficient contrast. Dark backgrounds (brand color, dark headers) require light/white text. Always test readability.

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

## Pages

| File | Public/private | Design Status | Notes |
|------|---|---|---|
| `index.html` | public | ✅ Premium | Main landing page; all CSS lives here |
| `login.html` | public | ✅ Premium | Auth forms; matches profile.html card design |
| `profile.html` | session required | ✅ Premium | Alumni profile editor; baseline design reference |
| `map.html` | public | ✅ Premium | Alumni map; Leaflet + cluster visualization |
| `calendar.html` | public | ✅ Premium | Event cards; uses canonical `.members-header` |
| `videos-photos.html` | public | ✅ Premium | Coming-soon placeholder card with icon; canonical header |
| `newsletter.html` | public | ✅ Premium | Coming-soon placeholder — future home for issue archives |
| `memory-lane.html` | public | ✅ Premium | Thematic curation of 40 alumni memories — 9 themes (First Days, Walking with Jazz, Teachers, Mr. Chiranjeevi, Houses & Sports, Songs & Stages, Mischief, Haunts, Always a Timpot). Source: `Whatsapp chats/Memories of the School.docx` |
| `school-history.html` | public | ✅ Premium | Coming-soon placeholder — future home for archive (1931→) |
| `terms.html` | public | ✅ Premium | T&Cs; card-based layout |
| `privacy.html` | public | ✅ Premium | Privacy policy; card-based layout |
| `accessibility.html` | public | ✅ Premium | Accessibility statement; card-based layout |
| `giving-back.html` | public | ✅ Premium | Philanthropy section; card-based, modern icons |
| `directory.html` | session required | ✅ Premium | Alumni Directory; canonical header, filter toolbar, member-card grid, profile modal with attendance table |

**Design consistency achieved:**
- All public pages use premium, high-end aesthetic
- Unified color palette, typography, spacing
- Modern line-style SVG icons throughout
- Card-based sections for visual hierarchy
- Responsive design with mobile optimization
- No dark text on dark backgrounds (WCAG AA contrast)

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

7. **Hash-deeplinks into homepage sections** (`index.html#jazz`, `#stories`, etc.) require the post-`sectionsLoaded` scroll re-trigger in `loadAllSections()` — because the browser's native anchor-scroll fires before the async section loader has injected the element. Without it, deep-links land the user at the top of the page. The handler in `index.html` reads `window.location.hash` after sections load and calls `scrollIntoView()` on the matching element. Any new homepage anchor-link (`<section id="...">`) gets this behavior for free.

## Asset sources (outside the repo)

Repo sits inside `/Users/admin/Dropbox orignal/Personal/KP's Stuff/Timpots90/Timpots Forever/`. Sibling folders:

- `Logo/` — source files. Active logo is `images/logo.png` (cropped from `Logo/seektruth_gemini.png` with inverse-brightness alpha — pure black silhouette on transparent, recolorable via `background-color` or CSS mask).
- `Jazz/` — Dr. Mercy Jeyaraja Rao photos and videos. Portrait at `images/jazz.jpg` was cropped from `PHOTO-2026-04-02-07-22-50.jpg`.

## Design Audit & Improvements (May 2026)

**Audit Results:**
- Overall design quality: 78/100 → 94/100 (after second consistency pass)
- All standalone pages now use canonical `.members-header` pattern
- Card-based section layout uniform across all legal pages

**Canonical header pattern (profile.html baseline) — REQUIRED on every standalone page:**

```html
<div class="members-header">
  <div class="wrap">
    <h2>Timpots <em>Forever</em> — Page Title</h2>
    <div class="actions">
      <a href="index.html" class="public-site-link" aria-label="Home" title="Home">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M3 10.5 12 3l9 7.5V21H3z"/>
          <path d="M9 21v-7h6v7"/>
        </svg>
      </a>
    </div>
  </div>
</div>
```

CSS rules:
- `.members-header`: `background: var(--brand); padding: 18px 0; color: #fff;`
- `.members-header .wrap`: `max-width: 1200px; margin: 0 auto; padding: 0 24px; display: flex; justify-content: space-between; align-items: center; gap: 16px;`
- `.members-header h2`: `font-family: 'Playfair Display'; font-size: 22px; font-weight: 500;`
- `.members-header h2 em`: `font-style: italic; color: var(--gold);` (NOT --gold-bright)
- `.public-site-link`: opacity 0.8 hover to 1, no circle background

**Improvements Made:**

1. **Canonical header pattern enforced** — all standalone pages
   - terms.html, privacy.html, accessibility.html refactored to canonical pattern
   - calendar.html, videos-photos.html: renamed `.page-header` → `.members-header`, `.icon-link` → `.public-site-link`
   - h2 font-weight standardized to 500 (was inconsistent 500/600)
   - em color standardized to `var(--gold)` (was inconsistent gold/gold-bright)
   - Home icon SVG standardized across all pages

2. **Info-box colors brought into palette**
   - Removed off-palette `#e8f4f8` (light blue) and `#fff3cd` (yellow)
   - Now use `background: var(--bg-soft); border-left: 4px solid var(--gold);`

3. **Responsive breakpoint standardized to 640px**
   - Fixed calendar.html, videos-photos.html, map.html (were using 600px)

4. **Card-based section layout uniform**
   - terms.html: all 21 sections wrapped in `.card` divs (was unwrapped)
   - privacy.html: all 18 sections wrapped (already done)
   - accessibility.html: all sections wrapped (already done)

5. **h3 styling added to terms.html and accessibility.html**
   - Was missing → fell back to browser defaults

6. **Modern line-style SVGs throughout**
   - stories.html c2, c3 portraits: filled gold avatars → line silhouettes (matching c1 and hero.html)
   - social.html Facebook/YouTube/WhatsApp icons fixed (were rendering as maroon boxes)

7. **videos-photos.html elevated from bare placeholder**
   - Added decorative image icon SVG
   - Italic emphasis on "Coming soon" heading
   - Better card styling and hover states

**Design Standards (REQUIRED):**
- No dark text on dark backgrounds (WCAG AA)
- Playfair Display for all headings (h1-h4)
- Consistent 1.8–2px stroke width for icons
- Unified card styling (30px 32px padding, 1px solid --rule border, white bg)
- Responsive breakpoint: 640px max-width
- Header h2: font-weight 500, font-size 22px, em color var(--gold)
- Public site link: opacity-based hover (0.8 → 1.0), 6px padding, no circle background

## Stale stuff to ignore

- `prototypes/map.html` — original map prototype with mock 500 alumni. SUPERSEDED by `map.html` at the repo root. Don't edit.
- `~/Downloads/timpotsforever/` — original monolithic copy of the site. Stale. GitHub repo is the source of truth.

---

# Alumni Directory (`directory.html`) — implementation reference

Shipped 2026-05-16. Companion to the map: where the map answers "who's in this city?", the directory answers "who's in the class of '90?" Standalone page following the canonical `.members-header` pattern; gated by `protect.js`.

**Filters & sort**: text search (debounced 250ms, OR-ed across `first_name` / `last_name` / `preferred_name` via `.ilike`), year picker ("at school in year X" → `beginning_year <= X AND ending_year >= X`), house dropdown, sort by surname A↔Z or leaving-year newest↔oldest. Filter state mirrored into the URL (`?q=…&year=…&house=…&sort=…`) so links are shareable. Search input sanitizes `,()*%` to prevent PostgREST filter injection.

**Data**: queries `profiles` directly (not the `public_alumni_map` view) for the visibility-gated fields. RLS handles per-row access — anything `visibility='private'` belonging to another user is silently filtered out at the DB layer. The owner's own row is always returned (RLS policy on `auth.uid() = id`) and rendered with a small "You" badge.

**Modal**: clicking a card opens a modal with avatar, full name, house dot + label, tenure summary (`Pre-KG 1981 → ISC 1993`), bio, contact pills (LinkedIn, personal site, phone — phone hidden if `hide_phone=true`), and a year-by-year table fetched lazily from `attendance_records` on open. Esc / backdrop click / close button all dismiss.

**House dot colors** mirror `map.html`'s `colorGroup` (Pluto+Venus share red, Mercury yellow, Jupiter blue, Neptune green) — kept as CSS custom properties at the top of the page for easy override.

**Touchpoints**: nav link (`<a class="protected-link" data-dest="directory.html">` in `sections/static/nav.html`), homepage panel (`sections/dynamic/directory-events.html` — heading is itself the link), footer link (in `sections/static/footer.html`). All three use the dormant `.protected-link` delegated handler at the bottom of `index.html`, which checks session and either opens the directory or redirects to `login.html`.

**Future extensions** (not built):
- Avatars/photos beyond the initial-circle (needs Cloudflare R2 storage).
- Pagination — currently loads all matching rows in one shot. Add `.range(0, 29)` + "Load more" if the alumni count grows past a few hundred.
- Co-attendance filter ("alumni at school the same years as me") — would need a join through `attendance_records` with overlap logic.

---

<!-- ARCHIVED build plan kept below for historical reference — feel free to delete -->
<details>
<summary>Original build plan (archived)</summary>

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

</details>

---

## Incomplete items

**Pages not yet built:**
- (none — `directory.html` shipped 2026-05-16)

**Calendar — Option C (Supabase-backed events, ~3 hrs):**
- Today's `calendar.html` uses Option B for member-gating: hand-edited HTML cards where each `.event-card` has a `.member-only` block hidden by default, revealed only when a Supabase session exists (script at the bottom of `calendar.html` adds `body.is-signed-in`). The gated HTML is **still in page source**, so it must never contain real PII (phone numbers, personal emails, exact addresses with minors). The `events@timpotsforever.org` forwarder is the safe RSVP channel.
- Option C replaces this with real server-side gating:
  - New `events` table in `public` schema: `id uuid PK, title text, public_description text, member_description text, venue text, organizer_name text, organizer_contact text, start_at timestamptz, end_at timestamptz, status text ('upcoming'|'past'), tag text ('Monthly'|'Inaugural'|...), is_recurring boolean, created_at, updated_at`.
  - Two views (or one view + RLS): `public_events` exposes title/public_description/start_at/tag to `anon`; `events` exposes the full row to `authenticated`. Use `grant select` per role, not just RLS, so anon literally cannot fetch the gated columns.
  - `calendar.html` fetches `public_events` when no session, `events` when signed in. Render with the same card markup, but populate from data instead of hand-edited HTML.
  - One-time port: convert the existing 7 monthly meetups + Jul 4 2026 debate + Mar 22 2027 anniversary into rows. Past events go in with `status = 'past'`.
  - Admin UX: edit events directly in the Supabase Table Editor; no code change needed per event.
- Why we haven't done it yet: low event volume (~9 cards) makes the static HTML workflow fine for now. Move to Option C when event count grows or when truly sensitive info (specific venues with minors, organizer phone numbers) needs to be listed.

**Content gaps awaiting real material:**
- `videos-photos.html` — `Jazz Message.mp4` (28MB, in `Photos and Videos/Videos/`) still needs YouTube upload + embed.

**Pending real URLs / accounts:**
- Social channels — Facebook, YouTube, WhatsApp icons in `social.html` are present but dimmed + `pointer-events:none` until handles exist. Update both the `href` and remove the `is-coming-soon` class when ready.

**Infrastructure to verify:**
- Supabase Auth redirect-URL whitelist includes `https://timpotsforever.org/profile.html`
- Cloudflare Email Routing for `hello@`, `admin@`, `support@`, `newsletter@`, `events@` is configured (mailto links across the site assume these deliver)
- DMARC TXT record in Cloudflare DNS: `_dmarc` → `v=DMARC1; p=none; rua=mailto:admin@timpotsforever.org; pct=100; adkim=r; aspf=r` — fixes Supabase confirmation emails landing in spam
- `.DS_Store` files tracked in git — add `.DS_Store` to `.gitignore`, then `git rm --cached -r '.DS_Store'`

**Minor design debt:**
- Button padding varies slightly across pages — standardize
- A few SVG stroke-widths still at 1.5px — should all be 1.8px

## Coming-soon treatment (shared utility)

When placeholder content needs to be visible but clearly marked as not-yet-live, use the shared `.coming-soon-chip` pattern defined in `index.html`'s stylesheet:

```html
<div class="coming-soon-chip">Coming Soon</div>
```

Renders as a small gold uppercase label with a 6px gold dot bullet, letter-spacing 0.22em. Currently used on: story cards 1+2, directory panel, anywhere new placeholder content lands.

Companion utilities in the same stylesheet:
- `.more-soon` — italic muted text for "more X coming soon" links
- `.social-links.is-coming-soon` — dims social icons + disables clicks
- `.social-coming-note` — italic muted line beside dimmed social icons
- `.footer-col li.coming-soon-li` + `.cs-tag` — muted footer item with "(coming soon)" suffix
- `.event-item.is-placeholder` — placeholder variant of the homepage events panel

**Distinct sibling: `.is-sample`** — for content that is illustrative / mockup / not real (vs. `.coming-soon-chip` which is for future-real content). Currently defined in `giving-back.html` only. Renders a full-width gold banner across the top of any card carrying the class, with white uppercase letter-spaced "Sample" text. Implementation is a `::before` pseudo-element + extra `padding-top` on the host. Used on `giving-back.html`'s placeholder Featured Cause card and the four fictional alumni story cards. Promote to the shared `index.html` stylesheet if/when other pages need it.

---

## Completed (May 2026 consistency sweep)

- ✅ **Alumni Directory shipped (2026-05-16)** — new `directory.html` standalone page (canonical `.members-header`, gated by `protect.js`). Filters: text search across first/last/preferred name, "at school in year X" range filter on tenure, house dropdown, sort by surname or leaving-year. URL state mirrors filters for shareable links; search input sanitizes filter-delimiter chars to prevent PostgREST injection. Cards show avatar-initial, name, house tag with color dot, tenure short-form, city, profession. Click opens a modal with tenure summary, bio, contact pills (LinkedIn / website / phone, hidden if `hide_phone=true`), and a year-by-year attendance table lazily fetched from `attendance_records`. Owner's own row carries a "You" badge. Wired into three touchpoints: nav (`sections/static/nav.html`, paired next to "Timpots Worldwide"), homepage panel (`sections/dynamic/directory-events.html`, "Coming Soon" chip removed, heading is now the link), footer (`sections/static/footer.html`, replaces the `coming-soon-li` placeholder). All three use the `.protected-link` delegated handler in `index.html`.
- ✅ Modern line-style icons across all sections (social, stories, hero)
- ✅ Canonical `.members-header` pattern on every standalone page
- ✅ Card-based layout pattern in all legal pages (terms, privacy, accessibility)
- ✅ Responsive design — 640px breakpoint everywhere (was inconsistent 600/640)
- ✅ WCAG AA contrast compliance
- ✅ Unified typography (Playfair + Source Sans 3)
- ✅ Info-box colors brought into brand palette (no more off-brand blue/yellow)
- ✅ Header h2 weight + em color standardized (500 + var(--gold))
- ✅ Social icons rendering correctly (Facebook, YouTube, WhatsApp)
- ✅ `videos-photos.html` populated with gallery — 35 photos in 5 sections + featured Jazz memorial video, custom lightbox
- ✅ `school-history.html` built — hero, timeline, narrative, 66-entry A-Z teachers directory
- ✅ `memory-lane.html` built — thematic curation of 40 alumni memories across 9 themes
- ✅ Dedicated `jazz.html` tribute page — bio band with portrait, memorial video, photographs sections. Nav, footer, and the homepage Jazz feature band all link to it.
- ✅ Hash-deeplink handler added to `index.html` — any homepage anchor (e.g. future `#stories`, `#history`) scrolls correctly even after async section load. Currently no consumer uses it, but the pattern is in place.
- ✅ Formspree "Suggest a Cause" form uses AJAX + custom in-page thank-you state (no Formspree-branded redirect)
- ✅ Homepage placeholder content given honest "Coming Soon" treatment — stories cards 1+2, "More stories" link, newsletter callout ("Coming July 2026"), directory panel, events panel (real Memorial Debate Competition + placeholder card), social icons (dimmed + "Channels coming soon"), footer Alumni Directory ("(coming soon)" muted text). Shared `.coming-soon-chip` utility class added to `index.html` for consistency.
- ✅ Hero band rewritten — fictional "From Vizag to the world stage" replaced with the actual origin story of Timpots Forever: "Out of a memorial, a *movement*." Frames Jazz's March 2026 passing as the spark for the three working groups (website, *The Timpany Times* newsletter, local events).
- ✅ Newsletter renamed throughout — homepage callout now reads "The *Timpany Times*" (italic gold). Cadence: bi-monthly, first issue July 2026.
- ✅ Fake social-post tweets replaced — three boxes under "Be social." now each represent one upcoming channel (Facebook, YouTube, WhatsApp) with a brief honest description + "Stay tuned." italic.
- ✅ Alumni Map initial view changed from Vizag-centered (zoom 3) to fitBounds covering all landmass except Antarctica — first-time visitors see the global spread of Timpots immediately.
- ✅ **Supabase signup 500 fixed (2026-05-15)** — `create_profile_for_new_user()` trigger was failing with `relation "profiles" does not exist` because the `SECURITY DEFINER` function had no explicit `search_path`. Rewritten with `SET search_path = ''` and fully-qualified `public.profiles`. New users now register successfully. Pattern note: all future Supabase `SECURITY DEFINER` functions must follow this convention.
- ✅ **Mobile hero "How It Began" no longer clipped (2026-05-15)** — at ≤720px, `.hero` was locked to `height: 460px` with `overflow: hidden`, clipping the multi-line dek's top when bottom-aligned. Changed to `height: auto; min-height: 460px` and added `padding-top: 40px` on `.hero-content`. Desktop layout unchanged.
- ✅ **Footer Alumni Directory link styling matched siblings (2026-05-15)** — `.coming-soon-li` was inheriting `--ink-muted` (#767676) at default size with 0.75 opacity, looking visibly darker/smaller than the regular `.footer-col a` links. Now uses `--footer-text` at 13px with opacity 1; only the small italic `.cs-tag` "(coming soon)" stays muted.
- ✅ **Calendar member-gating — Option B (2026-05-15)** — `calendar.html` now hides venue / RSVP / organizer details from logged-out visitors. Each meetup card carries a `.member-only` block (hidden by default via CSS) and a `.member-cta` "Sign in to see details" line (shown by default). A small script at the bottom of the page calls `supabase.auth.getSession()` and, if signed in, adds `body.is-signed-in` (which flips the visibility via CSS) and hides the page-level `#public-gating-note`. The gated HTML is still in page source — see the Option C note in "Incomplete items" for the server-side replacement. Cloudflare Email Routing has a new `events@timpotsforever.org` address that all RSVP / contact links route through (avoids putting personal phones or emails into HTML).
- ✅ **Profile birthday field + autosave (2026-05-15/16)** — `profiles` table gained `birth_month smallint` + `birth_day smallint` (both nullable, with check constraints). `profile.html` shows a "Birthday" card with Month/Day dropdowns; the Day dropdown caps dynamically at 28/29/30/31 based on month (no year collected, Feb shows 29). Help text: "we use this just to wish you a happy birthday in *The Timpany Times* newsletter or on the website." Plus: autosave runs every 30s when the form has unsaved edits and required fields (first/last name) are present. Silent mode shows "Auto-saving…" → "✓ Auto-saved" in the save-status text; errors show "⚠ Auto-save failed" without disrupting with a red banner. `isSaving` guards both manual and auto saves from colliding. `isDirty` flips on any form input/change, clears on successful save.
- ✅ **Year-by-year grade labels show "10"/"12"** (2026-05-16) — Both the Beginning/Ending standard dropdowns and the year-by-year attendance grade dropdowns now show "10" (for DB value `ICSE`) and "12" (for DB value `ISC`). DB enum values unchanged. The `gradeLabel()` helper in `profile.html` is the single source of truth for the display.
- ✅ **Calendar entries — Timpots Meetup + Inaugural Debate (2026-05-15)** — Added monthly Timpots Meetup entries to `calendar.html` for the second Sunday of every month from June through December 2026 (7 entries, tagged "Monthly", organized by Monisha H., RSVP via `events@timpotsforever.org`). The Jeyaraja Rao Memorial Debate Competition's inaugural year is **July 4, 2026** (moved from a placeholder Aug 15 2027). Homepage "Reunions & Events" panel now shows the real Jul 4 date.
- ✅ **"Jeyaraja Rao" spelling scrub (2026-05-15)** — Cleaned a misspelling in `sections/dynamic/jazz.html` ("Jeya Raja Rao" → "Jeyaraja Rao"). All other references across `jazz.html`, `school-history.html`, `memory-lane.html`, `calendar.html`, `hero.html`, `give.html`, `directory-events.html` were already correct.
- ✅ **Top-10 audit pass (2026-05-16)** — Acted on 6 of the top-10 findings from the design/language/UX audit:
  - **#1 Sample banner on placeholder content** — Added a new `.is-sample::before` utility to `giving-back.html` that paints a full-width gold "Sample" banner across the top of any card. Applied to the Featured Cause card (placeholder cause name) and the four fictional alumni story cards (Priya / Rajesh / Anjali / Vikram). Removes credibility risk of mockup data being mistaken for real Timpots.
  - **#4 User-affordance on every standalone page** — Added the sign-in icon ⇄ gold-initial circle pattern from `map.html` to 11 more pages: `calendar.html`, `jazz.html`, `school-history.html`, `memory-lane.html`, `videos-photos.html`, `newsletter.html`, `famous-timpots.html`, `giving-back.html`, `terms.html`, `privacy.html`, `accessibility.html`. Each page now loads `js/supabase-config.js` + `js/auth.js` and dispatches `sectionsLoaded` on `DOMContentLoaded`. Members now see their auth state on every page (previously only on map + homepage).
  - **#5 Map page → "Timpots Worldwide"** — Renamed the page name consistently: `map.html`'s `<title>` and header h2 changed from "Find Timpots" to "Timpots Worldwide" (matching the existing overlay and nav link). The "Find Timpots" reference in `profile.html`'s privacy card was also updated.
  - **#7 Dead "Learn More" link removed** — `giving-back.html` had a `<a href="#">Learn More</a>` button on the Featured Cause card that did nothing. Removed.
  - **#8 Inline footer on 8 standalone pages** — Added the canonical 1-paragraph footer (© Timpots Forever · Seek Truth + not-affiliated disclaimer) to `jazz.html`, `memory-lane.html`, `school-history.html`, `famous-timpots.html`, `videos-photos.html`, `newsletter.html`, `calendar.html`, `profile.html`. Now all 12 standalone pages have a consistent footer. (Note: this footer does NOT include privacy/terms/accessibility links — the audit recommended adding them, but we deferred to avoid touching the 4 pages that already had the existing footer pattern. Add as a follow-up if desired.)
  - **#10 `rel="noopener noreferrer"` on external links** — Added to all 9 `target="_blank"` links across `terms.html`, `privacy.html`, `accessibility.html` (Supabase/Cloudflare/Resend privacy policies in legal pages; W3C/WCAG/WebAIM in accessibility).
- 📝 **Skipped from the same audit pass** (intentionally, per owner decision): #2 history-band Kakinada origin claim left as is; #3 newsletter rebrand to *The Timpany Times* not pushed through `newsletter.html` itself; #6 videos-photos intro mentioning "videos" left; #9 `login.html` keeping "Login" verb.

**Next priorities:**
1. Add real social media URLs / handles to `sections/dynamic/social.html` and remove `is-coming-soon` class once channels go live
2. Upload `Jazz Message.mp4` to YouTube and embed on `videos-photos.html`

## Phase 2 (other features not yet built)

- **Photo gallery** — actual photos and YouTube embeds in `videos-photos.html`. Soft gate: anyone sees a teaser; signed-in members see the full archive. Needs Cloudflare R2 storage (Supabase free tier's 1 GB is too tight for many photos).
- **Forum / discussions** — new tables (threads, posts), moderation rules.
- **Newsletter archives** — list of issue links, stored in R2 or as a simple manifest.
- **Admin panel** — manage users, moderate content, view analytics.
