# Timpots Forever

Static site for the Timpany School alumni community. Intended for hosting on Cloudflare Pages; target domain `timpotsforever.org`.

GitHub: `zeebanker/timpotsforever`. Default branch `main`.

## Architecture

Modular static site. `index.html` carries ALL CSS plus a JavaScript section loader. Content lives in standalone files under `sections/`:

- `sections/static/` — masthead, nav, footer (rarely change)
- `sections/dynamic/` — jazz, hero, stories, newsletter-callout, directory-events, history, give, social (updated often)

The loader fetches each section's HTML via `fetch()` and injects it into a placeholder `<div>` in `index.html`. Sections are pure HTML fragments — no `<html>`, `<head>`, `<style>`, or `<script>` tags inside them. Loading is sequential (one section at a time, errors don't block other sections).

**Local dev**: must be served over HTTP (`file://` breaks `fetch()` due to CORS). Quick option from the repo root:

```
python3 -m http.server 8000
```

Then visit `http://localhost:8000`. Hard-refresh (Cmd+Shift+R) after edits.

## Design system

- **Fonts**: Playfair Display (display/serif) + Source Sans 3 (sans). Loaded via Google Fonts at the top of `index.html`. The Playfair link must include italic variants (`ital,wght@0,400;0,600;0,700;1,400;1,500;1,700`) — the masthead's `<em>` italic styling depends on real italic glyphs, not faux-italic.
- **Brand colors** (CSS vars in `:root` at the top of `index.html`):
  - `--brand: #7a1420` (deep garnet)
  - `--gold: #b5894a` (muted bronze)
  - `--gold-bright: #f0c579` (bright gold; use on dark/garnet backgrounds)
- **Tagline**: "Seek Truth"

## Asset sources (outside the repo)

The repo sits inside `/Users/admin/Dropbox orignal/Personal/KP's Stuff/Timpots90/Timpots Forever/`. These sibling folders hold source assets:

- `Logo/` — source SVGs (`seektruth_faithful.svg`, `seektruth_logo_base.svg`, `seektruth_gemini.png`). Active logo is `images/logo.svg`, copied from `seektruth_faithful.svg`.
- `Jazz/` — Dr. Mercy Jeyaraja Rao photos and videos. The portrait at `images/jazz.jpg` was cropped from `PHOTO-2026-04-02-07-22-50.jpg` (a memorial poster — only the rectangular portrait region was extracted, removing the surrounding text).

## Conventions

- Use `<img src="images/...">` for logos and photos, not inline `<svg>`. Inline `<svg>` without explicit width/height renders inconsistently between Chrome (giant default) and Safari (collapsed).
- All CSS lives in `index.html`. Section files are pure HTML fragments and reference existing CSS classes by name.
- An older monolithic copy of this site exists at `~/Downloads/timpotsforever/`. It is stale — ignore it; the GitHub repo is the source of truth.

## Phase 2 ideas (not yet built)

From the original README: alumni directory backed by Supabase, profile editing, forum, photo gallery, transactional email (Resend), admin panel. Login/members pages from the old monolithic copy aren't ported into this modular structure yet.
