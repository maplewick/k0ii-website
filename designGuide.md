# KOii Design System

This is the standing design reference for the KOii site. Every future design or build task — for any AI tool or person — should follow this document. It is not a one-off prompt; it's the source of truth that prompts and tasks get built on top of later.

**Direction, locked in:** cartoon koi pond, matching the banner's painted/soft-shaded style (rounded shapes, gradient shading, warm color) — while still reading as a modern, usable dashboard. Cartoonish is the skin; clarity and speed are the engineering. Neither one should apologize for the other.

---

## 0. The standard to hit

The banner is the reference. Every surface in the product — cards, buttons, tables, badges, inputs, empty states — should look like it was painted by the same illustrator in the same style, just repurposed for UI. If a component would look identical with the decorative koi/lily-pad icons deleted, it has not been designed to this system yet — the pond styling has to live in the surface itself (shape, fill, shadow, color), not just in icons placed near it.

"Modern" in this system means: fast to scan, clear hierarchy, responsive, accessible, restrained motion — not flat slate rectangles and gray hairlines. Cartoonish and modern are both required at once; neither is a placeholder for later.

---

## 1. System prompt block

Paste this at the start of any AI session doing design or UI work on this site, before the specific task:

> This site is KOii, a Roblox clan-war dashboard. Follow the KOii Design System exactly: cartoon koi pond identity (painted-style koi and lily pads, matching the reference banner), light mode = sunlit day pond, dark mode = moonlit night pond. Every surface — cards, buttons, badges, inputs, tables, nav, empty/error states — must carry the pond styling itself: rounded/organic shapes, the token color palette, soft layered shadows, the display typeface on all heading-level text. This has to feel like a real, fast, usable dashboard at the same time — dense data (like the roster table) stays legible and quick to scan even while reskinned. Do not fall back to flat rectangles, sharp corners, hairline gray borders, single-accent coloring, or leaving any component's shape/fill unchanged while only adding decorative icons nearby.

---

## 2. Color tokens

Use the full palette across every surface — not just koi-orange as a single accent dropped into an otherwise gray/slate UI.

### Day (light mode)

| Token              | Hex                              | Use                                                       |
| ------------------ | -------------------------------- | --------------------------------------------------------- |
| `pond-bg`          | `#5FCBDB` → `#3AA8C4` (gradient) | page background                                           |
| `card-surface`     | `#FBF3E7`                        | cards, panels, table container, modals                    |
| `card-surface-alt` | `#EFE2CC`                        | nested panels, table row stripe, input fill               |
| `koi-orange`       | `#E8801F`                        | primary buttons, active tab/nav, key numbers              |
| `koi-orange-deep`  | `#C4650F`                        | hover/pressed states                                      |
| `lily-green`       | `#5FAE63`                        | success, positive status, toggles-on                      |
| `pond-teal`        | `#2E96A8`                        | links, info states, secondary buttons                     |
| `ink`              | `#2B2320`                        | body text on cream surfaces                               |
| `ink-soft`         | `#6B5D50`                        | secondary/muted text, placeholders                        |
| `alert-coral`      | `#D9663F`                        | destructive actions/errors only (not general "attention") |

### Night (dark mode)

| Token              | Hex                              | Use                                          |
| ------------------ | -------------------------------- | -------------------------------------------- |
| `pond-bg`          | `#0B1F2E` → `#071420` (gradient) | page background                              |
| `card-surface`     | `#16303F`                        | cards, panels, table container, modals       |
| `card-surface-alt` | `#0F2431`                        | nested panels, table row stripe, input fill  |
| `koi-orange`       | `#F2954D`                        | primary buttons, active tab/nav, key numbers |
| `koi-orange-deep`  | `#D97B33`                        | hover/pressed states                         |
| `moon-teal`        | `#4FD4C4`                        | success, positive status, toggles-on         |
| `pond-blue`        | `#5FB4D6`                        | links, info states, secondary buttons        |
| `ink`              | `#EDE6DA`                        | body text on card surfaces                   |
| `ink-soft`         | `#9FB0BC`                        | secondary/muted text, placeholders           |
| `alert-coral`      | `#E27B5C`                        | destructive actions/errors only              |

**Rules:**

- Every card gets a real fill from `card-surface` — visible contrast against the page background, the way a lily pad reads against water. Never a near-transparent overlay.
- Gray is not a functional color anywhere in this system. Borders, muted text, disabled states, secondary buttons — every one of those pulls its color from this palette instead of default gray.
- `alert-coral` is reserved for genuinely destructive/error actions (delete, failed request). Ordinary "needs attention" states (offline, pending, waiting) use `koi-orange`, not red — keeps the palette closed and non-alarming.

---

## 3. Shape, elevation & spacing

### Radius scale

| Element                                                       | Radius                                                          |
| ------------------------------------------------------------- | --------------------------------------------------------------- |
| Buttons, pills, badges, tags, toggle tracks                   | fully rounded (`9999px`)                                        |
| Cards, panels, modals, image containers                       | `24px`                                                          |
| Inputs, dropdowns, selects, small chips, table row hover fill | `16px`                                                          |
| Table container                                               | `24px` (rows stay square-cornered inside the rounded container) |

Nothing in the UI goes below `12px`. Sharp corners are the single strongest "generic dashboard" tell — avoid them everywhere, including inside dense components like tables and forms.

### Elevation (shadows)

- Cards/panels float gently above the page, like a lily pad sitting slightly above the water: soft, blurred, layered shadow — warm-toned in light mode, cool-toned in dark mode. Never a flat gray box-shadow.
- Buttons get a small, tight shadow on default state that grows slightly on hover — physical, not decorative.
- Modals/dialogs get the strongest shadow in the system, to clearly separate them from the page behind.

### Spacing

- Base unit: 4px. Card internal padding: 24–32px. Section spacing on a page: 64–96px between major sections, 24–32px between related elements within a section.
- Generous whitespace around cartoon elements (icons, badges, illustrations) — cramped spacing fights the friendly tone.

---

## 4. Typography

| Role                             | Typeface                                 | Where                                                                                                                                           |
| -------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Display (all heading-level text) | **Fredoka**, bold/medium weight          | Page H1s, every section H2/H3 ("Why Join," "Requirements," "Clan Graphs," "My Profile," card titles), nav wordmark, hero numbers, button labels |
| Body / UI text                   | Inter or Manrope                         | paragraphs, descriptions, table cells, form labels, nav links                                                                                   |
| Numeric / stats                  | Inter or Manrope, tabular-figure variant | roster table figures, PPH/points/kick columns, stat cards                                                                                       |

**Rule:** the display face applies to _every_ heading-level string on the page, not just the single largest one. A page with five section headers has five headers in Fredoka, not one hero line in Fredoka and four in the plain UI sans.

---

## 5. Iconography & illustration

- **Functional icons** (search, sort, chevrons, close, nav): lucide-react, used plainly — these don't need to be cartoon, they need to be legible at small sizes.
- **Identity icons/illustrations** (badges, empty states, status characters): custom painted-style art matching the Career Badges tile style — a filled, shaded icon on a rounded tile, not a line icon. This is the calibration reference for the whole system: if a new illustrated element doesn't look like it belongs in that badge set, it's off-style.
- **Ambient background layer**: koi and lily pads drifting slowly behind page content, low opacity, `pointer-events-none`, present on every page as a constant. This is the finishing layer, not a substitute for redesigning the surfaces in front of it.

---

## 6. Component recipes

### Buttons

- Primary: fully rounded pill, `koi-orange` fill, high-contrast text, soft warm shadow. Label in the display face.
- Secondary: fully rounded pill, `card-surface-alt` fill, 2px border in `pond-teal` or `koi-orange`.
- Destructive: fully rounded pill, `alert-coral` fill, used only for genuinely destructive actions.
- Disabled: same shape, `card-surface-alt` fill at reduced opacity, no shadow.
- Icon buttons (theme toggle, etc.): circular, `card-surface` fill, soft shadow — matches the existing sun/moon toggle treatment, keep that one as-is.

### Cards & panels (stat cards, roster summary, requirement boxes, "why join" tiles)

- `card-surface` fill, `24px` radius, soft layered shadow.
- A faint internal gradient or painted texture suggesting light through shallow water — not a flat single fill. This is what separates "cartoon pond" from "rounded box."
- Border optional; if used, 1.5–2px, low-opacity pond-palette color, never gray.

### Status pills / badges (Offline, Between wars, Waiting for data, etc.)

- Fully rounded, filled with palette color: `lily-green`/`moon-teal` for positive/active, `koi-orange` for pending/attention, `pond-teal` for neutral/info, `alert-coral` only for genuine errors.
- Career Badges tiles (painted icon + title + subtext on a rounded tile) are the reference standard — any new badge-like element should look like it belongs in that same set.

### Tables (roster, leaderboards)

- Rounded container (`24px`), clipping the rows inside.
- Header row: keep the small-caps utility label style (RANK / PLAYER / TOTAL) in the body typeface — this is scan-speed territory and stays close to "modern," not cartoon.
- Row fill alternates `card-surface` / `card-surface-alt`; hover state tints toward a soft teal wash, not flat gray.
- Row separators: thin, low-opacity pond-color rule instead of a hard gray line — or no rule at all, relying on the alternating fill.
- Loading-skeleton bars: fully rounded ends, pond-palette color at reduced opacity — not square-ended gray bars.
- Numeric columns stay dense and tabular — no extra decoration inside the grid itself. The container carries the theme; the data inside stays fast to read.

### Forms & inputs (search box, "check my rank" input, etc.)

- `16px` radius, `card-surface-alt` fill, `pond-teal`/`koi-orange` focus ring (soft glow, not a hard outline).
- Placeholder text in `ink-soft`.
- Paired button (e.g. "Check My Rank") follows the primary button recipe directly adjacent, not a separate visual language.

### Navigation bar

- Wordmark in display face with the live koi illustration behind/around it (already working — keep).
- Nav links in body face; active link gets `koi-orange` color + underline in the same color, not a generic default-blue active state.
- Theme toggle stays circular, top-right, as currently placed.

### Tabs (Roster / Leaderboards / Battle Rewards, Points / Rate-h, time-range selectors)

- Rounded pill group; active tab = filled `koi-orange` pill with dark/white text; inactive tabs = transparent with `ink-soft` text, no visible container until hovered.
- This is already close to correct in the current build (the 7d/Points pills) — extend this exact treatment to every tab/segmented-control instance site-wide, including ones currently styled as plain text links (e.g., the Roster/Leaderboards/Battle Rewards row).

### Sliders (Clans Shown range slider)

- Track: rounded, `card-surface-alt` fill with `koi-orange` fill on the active portion (matches current behavior).
- Thumb: larger, soft-shadowed circle in `card-surface` with a thin `koi-orange` ring — should read as a smooth pebble, not a default OS slider handle.

### Numbered process steps (How to Apply 1–4)

- Number sits inside a filled `koi-orange` circle (not muted gray), in the display face.
- Card around each step follows the standard card recipe.

### Empty / error / loading states

- Standard card recipe as the container.
- A real, properly sized illustrated character or icon (confused koi, paused ripple, etc.) — not a small icon awkwardly floated next to the heading.
- Copy stays plain, specific, and un-cutesy; the container carries the personality, the words stay functional.

### Modals / dialogs

- Strongest shadow in the system, `24px` radius, `card-surface` fill, softly scaled/faded entrance (no bounce/elastic easing).

### Toggles / switches

- Fully rounded track and thumb; on-state uses `lily-green`/`moon-teal`, off-state uses `card-surface-alt`.

---

## 7. Motion

- Background koi layer: slow, looping (20–30s), low opacity, respects `prefers-reduced-motion`.
- Card/content entrance: gentle fade + slight rise on load — no bounce or elastic easing anywhere in the system; motion stays calm, not toy-like.
- Interactive elements (buttons, tabs, toggles): quick, snappy hover/press feedback — this is where the system stays unambiguously modern.
- Theme switch (light ↔ dark): cross-fade the background gradient and card colors rather than a hard cut, so day→night itself feels like part of the pond concept.

---

## 8. Explicit don'ts

- Don't leave any card, button, table, or badge as a flat, sharp-cornered, single-color element and call it done by adding icons nearby.
- Don't use gray as a functional color anywhere — borders, muted text, disabled states, secondary buttons all pull from the token palette.
- Don't apply the display typeface to only the page's single largest heading — every heading-level string gets it.
- Don't use red/alarm coloring for routine status states (offline, pending) — reserve `alert-coral` for genuine errors/destructive actions only.
- Don't use bounce/elastic easing — motion stays calm and physical, not toy-like.
- Don't sacrifice table/data scan-speed for decoration — the roster table's rows and header stay dense and legible; the container and chrome around it carry the theme instead.
