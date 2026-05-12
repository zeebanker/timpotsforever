# Timpots Forever — Modular Website Structure

## Overview

This is a **component-based architecture** for the Timpots Forever website. Instead of one massive 1600+ line HTML file, content is split into 11 independent sections that load dynamically.

## Folder Structure

```
├── index.html                          # Main file (CSS + loader script)
├── sections/
│   ├── static/                         # Rarely-changing sections
│   │   ├── masthead.html               # Logo + institutional bar
│   │   ├── nav.html                    # Main navigation menu
│   │   └── footer.html                 # Footer with links
│   └── dynamic/                        # Frequently-updated sections
│       ├── jazz.html                   # Jazz memorial tribute
│       ├── hero.html                   # Featured story banner
│       ├── stories.html                # Three story cards
│       ├── newsletter-callout.html     # Newsletter promo box
│       ├── directory-events.html       # Alumni directory + events
│       ├── history.html                # School history section
│       ├── give.html                   # Philanthropy/fundraising
│       └── social.html                 # Social media feed
└── README.md                           # This file
```

## How It Works

### 1. **index.html** (Main File)
- Contains ALL CSS styling (from original file)
- Defines 11 empty `<div>` containers (one per section)
- Includes a JavaScript loader that:
  - Fetches each section file via `fetch()` API
  - Injects HTML into the corresponding container
  - Shows loading states and error messages
  - Runs **incrementally** (loads one section at a time)

### 2. **Loader Logic** (in index.html)
```javascript
const sections = [
  { id: 'masthead', path: 'sections/static/masthead.html', name: 'Masthead' },
  { id: 'nav', path: 'sections/static/nav.html', name: 'Navigation' },
  // ... more sections
];

async function loadSection(section) {
  // 1. Show "Loading..." message
  // 2. Fetch the section HTML file
  // 3. Inject into page OR show error if fetch fails
}
```

### 3. **Each Section File**
- Pure HTML only (no `<html>`, `<head>`, or `<style>` tags)
- Just the content that belongs in that section
- CSS classes match the styling in `index.html`
- Example: `sections/dynamic/hero.html` contains:
```html
<!-- ============ HERO ============ -->
<section class="hero">
  <div class="hero-bg"></div>
  <div class="hero-portrait">...</div>
  <!-- ... content -->
</section>
```

## How to Update Content

### Updating a Section
1. Open the section file (e.g., `sections/dynamic/stories.html`)
2. Edit the HTML content
3. Save the file
4. Refresh the page in your browser—the updated section loads automatically

### Example: Update the Featured Story
```bash
# Open this file in your editor:
sections/dynamic/hero.html

# Edit the headline, subtitle, or byline
# Save the file
# Refresh index.html in your browser → sees the update immediately
```

### Example: Add a New Event to the Directory
```bash
# Open this file:
sections/dynamic/directory-events.html

# Add a new <div class="event-item">
# Save
# Refresh browser → new event appears
```

## Loading Behavior

### Incremental Loading (Current Setup)
- Sections load **one at a time**, in order
- User sees the page appear progressively
- Fast sections load quickly; slow sections don't block others
- If one section fails, others still load
- Error messages appear for failed sections

**Example timeline:**
1. 0ms: Masthead loads
2. 50ms: Navigation loads
3. 100ms: Jazz memorial loads
4. 150ms: Hero loads
5. ... etc

### Error Handling
If a section file is missing or the server returns an error (404, 500, etc.), users see:
```
Failed to load Navigation
HTTP 404: Not Found
```

Errors appear in the page **and** the browser console (F12 → Console tab).

## Customization

### Change Loading Order
Edit the `sections` array in `index.html`:
```javascript
const sections = [
  { id: 'masthead', path: 'sections/static/masthead.html', name: 'Masthead' },
  // Move this one earlier or later
  { id: 'nav', path: 'sections/static/nav.html', name: 'Navigation' },
  // ...
];
```

### Load All Sections Simultaneously (Instead of One-at-a-Time)
Change this:
```javascript
async function loadAllSections() {
  for (const section of sections) {
    await loadSection(section);  // Wait for each
  }
}
```

To this:
```javascript
async function loadAllSections() {
  // Load all at once (faster, but one failure could affect others)
  await Promise.all(sections.map(section => loadSection(section)));
}
```

### Add a New Section
1. Create a new HTML file in `sections/dynamic/` or `sections/static/`
2. Add a new `<div id="section-ID"></div>` to `index.html`
3. Add an entry to the `sections` array:
```javascript
{ id: 'my-section', path: 'sections/dynamic/my-section.html', name: 'My Section' },
```

## Troubleshooting

### Sections Not Loading?
1. Open browser **Console** (F12 → Console tab)
2. Look for error messages like:
   - `Failed to load Stories: HTTP 404`
   - `Container not found for section: newsletter`
3. Check:
   - File exists at the correct path
   - Filename matches exactly (case-sensitive on servers)
   - No typos in the `sections` array in `index.html`

### Styles Look Wrong?
- All CSS is in `index.html` (not in section files)
- Check that CSS class names match the section HTML
- Example: `<section class="hero">` needs `.hero { }` styles in `index.html`

### Supabase/Authentication Not Working?
- Supabase scripts are **not** loaded in any section
- If you need auth, add this to the bottom of `index.html` (before `</body>`):
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="js/supabase-config.js"></script>
<script src="js/auth.js"></script>
```

## Benefits of This Approach

| Benefit | Why |
|---------|-----|
| **Easy Updates** | Change one section without touching the rest |
| **Faster Edits** | 50-line file vs. 1600-line file |
| **Parallel Work** | Team members can edit different sections simultaneously |
| **Reusability** | Sections can be moved to other projects |
| **Testing** | Test individual sections in isolation |
| **Performance** | Failed sections don't block the whole page |
| **Version Control** | Smaller diffs in Git = clearer change history |

## Technical Notes

- **Browser Support**: Works on all modern browsers (Chrome, Firefox, Safari, Edge)
- **Server Requirement**: Must be served over HTTP/HTTPS (file:// URLs don't work due to CORS)
- **No Build Tool Needed**: Plain JavaScript—no webpack, gulp, or bundler required
- **CSS Specificity**: All styles are global (in `index.html`), so section files don't need their own CSS

## Questions?

If a section looks broken or won't load:
1. Check the browser console for errors
2. Verify the file path is correct
3. Ensure the HTML is valid (no missing closing tags)
4. Test in an incognito/private window (rules out cache issues)

---

**Last updated:** May 2026
**Maintainer:** Timpots Forever Team
