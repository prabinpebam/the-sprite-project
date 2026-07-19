# SVG Theme Contract

## Separation of Concerns

An illustration has four independent layers:

1. **Content:** labels, data, entities, and relationships.
2. **Geometry:** positions, dimensions, paths, and hierarchy.
3. **Semantic theme:** color roles and appearance parameters.
4. **Delivery mode:** light/dark selection and embedding profile.

Changing layers 3 or 4 must not change content or measured geometry. If a heavier stroke or substituted font causes
overlap, regenerate and visually validate rather than silently moving semantic elements.

## Required Theme Shape

```json
{
  "name": "theme-name",
  "appearance": {},
  "modes": {
    "light": {},
    "dark": {}
  }
}
```

Custom modes such as `print`, `highContrast`, or `brandCampaign` may be added, but `light` and `dark` remain required
for reusable web/document themes.

## Color Token Semantics

| Token | Purpose |
| --- | --- |
| `canvas` | illustration background |
| `surface` | primary bounded regions/cards |
| `surfaceAlt` | alternating rows, nested zones, secondary regions |
| `text` | primary labels and values |
| `textMuted` | secondary annotation that remains readable |
| `line` | meaningful boundaries, axes, and connectors |
| `grid` | supporting grid/guides; may be lower contrast if not information-bearing |
| `accent` | primary focus and active state |
| `accentSecondary` | secondary focus or comparison series |
| `accentMuted` | accent-tinted surface/background |
| `onAccent` | text/symbols placed on `accent` |
| `positive` | success/completion color and border |
| `positiveSurface` | positive-state background |
| `onPositiveSurface` | content on `positiveSurface` |
| `warning` | warning/caution encoding |
| `danger` | error/blocker/high-risk encoding |

Factual colors are outside the theme. Examples include an exact LPC palette ramp, a measured heatmap scale, a flag,
or a product color being documented. Surrounding labels and structure still use theme tokens.

## Appearance Contract

| Field | Allowed values | Effect |
| --- | --- | --- |
| `preset` | `casual`, `formal`, `sharp`, `simple`, `friendly`, or custom | records the starting personality |
| `fontFamily` | self-contained CSS font stack | all generated SVG text |
| `cornerRadius` | `0–32` | maximum regular container radius |
| `pillRadius` | `0–64` | chip/pill radius |
| `strokeWidth` | `0.5–6` | primary outline weight |
| `connectorWidth` | `0.5–6` | relationship/axis weight |
| `lineCap` | `butt`, `round`, `square` | endpoint character |
| `lineJoin` | `miter`, `round`, `bevel` | corner character |
| `dash` | array of non-negative numbers | optional connector/outline rhythm |
| `density` | `compact`, `comfortable`, `spacious` | spacing and annotation density |
| `depth` | `flat`, `outlined`, `layered`, `shadowed` | surface separation strategy |

Use these as generator parameters, not post-generation search/replace targets.

## Preset Character

### Casual

- Round caps and joins, medium-heavy strokes, comfortable spacing.
- Two or three lively accents are acceptable when semantic.
- Layered depth may use offset flat shadows; avoid blur in restricted profiles.
- Best for approachable explainers, workshops, and informal education.

### Formal

- Small radii, thin precise strokes, restrained color count, compact spacing.
- Prefer aligned baselines, direct labels, and flat depth.
- Use serif typography only when the document/brand supplies a reliable font.
- Best for reports, policy, governance, and enterprise documentation.

### Sharp

- Near-square corners, square caps, miter joins, high contrast.
- Strong orthogonal routes and taut spacing.
- Avoid soft shadows, playful bubbles, and excessive rounded pills.
- Best for engineering, security, and high-precision technical subjects.

### Simple

- One accent plus neutrals, moderate small radius, thin consistent strokes.
- Spacious layout, flat depth, little decoration.
- Best default when audience, brand, or target renderer is uncertain.

### Friendly

- Rounded containers and pills, round caps/joins, warm secondary surfaces.
- Clear positive states and comfortable spacing.
- Keep body text and factual marks crisp; friendly does not mean childish.
- Best for onboarding, product storytelling, learning, and community tools.

## Light Mode Design

- Avoid using pure white for every surface; use subtle value differences to show grouping.
- Primary text should normally be a near-black chromatic neutral rather than `#000000`.
- Meaningful lines and axes require 3:1 contrast against their immediate background.
- Decorative grids may be subtler if they carry no information independently.
- Ensure pale accent surfaces still distinguish from canvas without depending on shadows.

## Dark Mode Design

- Build a separate palette; do not invert channels.
- Use at least two dark surface levels so grouping remains visible.
- Avoid pure white body text across large areas; a slightly softened white reduces glare.
- Lighten/desaturate saturated accents as needed; test color vibration and halos.
- Re-evaluate every pair: text/canvas, text/surface, line/canvas, on-accent/accent, and status surfaces.
- Keep factual swatches exact and give them borders that remain visible in the dark mode.

## Generator Integration

Load the JSON once, select a mode, then assign role values to rendering primitives:

```python
theme = json.loads(Path("theme.json").read_text(encoding="utf-8"))
mode = theme["modes"][selected_mode]
appearance = theme["appearance"]

CANVAS = mode["canvas"]
INK = mode["text"]
LINE = mode["line"]
RADIUS = appearance["cornerRadius"]
STROKE_WIDTH = appearance["strokeWidth"]
```

Generate every supported mode from the same geometry/data pass. Use deterministic names such as:

```text
architecture-light.svg
architecture-dark.svg
architecture-print.svg
```

If backward compatibility requires an unsuffixed filename, make it the documented default mode and still emit the
explicit variant pair.

## Embedding Strategies

### Inline SVG with host variables

Best for web apps that control the DOM. Define semantic properties in host CSS and use them in SVG attributes:

```css
:root {
  --svg-canvas: #ffffff;
  --svg-text: #1f2937;
  --svg-line: #64748b;
  --svg-accent: #6d28d9;
}

[data-theme="dark"] {
  --svg-canvas: #19151f;
  --svg-text: #f8f7fc;
  --svg-line: #a79cb5;
  --svg-accent: #a78bfa;
}
```

```xml
<rect width="100%" height="100%" fill="var(--svg-canvas)" />
<text fill="var(--svg-text)">Label</text>
```

Confirm that the sanitizer and target browser preserve custom properties.

### External SVG controlled by the host

External images do not inherit page CSS variables. Generate a pair and author:

```html
<img src="figure-light.svg"
     data-src-light="figure-light.svg"
     data-src-dark="figure-dark.svg"
     alt="..." />
```

When the host theme changes, resolve and assign the matching source. Preserve the same alt text, dimensions, aspect
ratio, title, description, and geometry in both variants.

### Standalone SVG controlled by the operating system

When embedded `<style>` is permitted, one file may use `prefers-color-scheme`. This follows the operating system,
not necessarily an application-level theme toggle. Always include a static default.

### Fixed-output variants

Office, print, email, and strict sanitized profiles should receive explicit files per mode. Never rely on CSS media
queries or inherited variables in those environments.

## Custom Brand Workflow

1. Copy `assets/theme-template.json` beside the project generator.
2. Replace semantic role values, not geometry constants.
3. Choose a preset and override only needed appearance fields.
4. Run `scripts/validate_theme.py`.
5. Generate every supported mode.
6. Render representative sparse, dense, data, and status-heavy figures.
7. Inspect light/dark switching in the real host.
8. Record known limitations, fonts, and approved brand values.

## Validation Beyond Contrast

Theme changes can cause non-color failures:

- thicker strokes crop at the viewBox edge or close small gaps;
- larger radii distort narrow nodes and bars;
- different fonts overflow containers;
- compact density creates connector/label collisions;
- shadows disappear on dark canvases;
- muted surfaces become indistinguishable;
- status colors no longer have distinct grayscale values.

Re-run the SVG illustration visual-validation loop after every theme or preset change.