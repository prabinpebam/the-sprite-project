---
name: svg-theme-system
description: "Design and apply customizable color themes and visual personalities to SVG illustrations. Use when SVGs must match a site, document, product, or brand; support light and dark mode; generate paired theme variants; or adopt a casual, formal, sharp, simple, or friendly visual style through semantic colors, corner radii, stroke shape and thickness, typography, density, and depth. Works alongside svg-illustration and validates theme contrast and token completeness."
---

# SVG Theme System

Theme SVG illustrations without coupling content geometry to literal colors or a single visual style. Keep two
independent choices composable:

1. **Color theme:** semantic color roles with explicit light and dark modes.
2. **Visual personality:** shape, stroke, type, density, and depth rules such as casual, formal, sharp, simple, or
   friendly.

Read [the theme contract](./references/theme-contract.md) for the complete schema and embedding strategies.

## When to Use

- Match SVGs to a site, document, product, or brand palette.
- Add light/dark variants that follow the host application or operating system.
- Let users customize theme values without editing illustration geometry.
- Apply a consistent visual personality across a set of figures.
- Convert hard-coded SVG colors and corner/stroke values into semantic tokens.
- Audit whether a visual theme remains accessible in every mode.

Do not use this skill to choose chart encodings, compose the illustration, or repair overlaps. Those remain owned by
`svg-illustration`; this skill owns the visual-language parameter layer only.

## Theme Contract

Use a JSON theme file with one shared appearance and at least `light` and `dark` color modes:

```json
{
  "name": "product-docs",
  "appearance": {
    "preset": "friendly",
    "fontFamily": "Segoe UI, Arial, sans-serif",
    "cornerRadius": 10,
    "pillRadius": 14,
    "strokeWidth": 2,
    "connectorWidth": 2,
    "lineCap": "round",
    "lineJoin": "round",
    "dash": [],
    "density": "comfortable",
    "depth": "flat"
  },
  "modes": {
    "light": { "canvas": "#FFFFFF", "text": "#1F2937" },
    "dark": { "canvas": "#19151F", "text": "#F8F7FC" }
  }
}
```

Start from [the theme template](./assets/theme-template.json). Every mode must provide the complete semantic token
set; never infer dark mode by mechanically inverting light colors.

## Semantic Color Roles

Geometry refers to roles, not brand names or literal hues:

- `canvas`, `surface`, `surfaceAlt`;
- `text`, `textMuted`;
- `line`, `grid`;
- `accent`, `accentSecondary`, `accentMuted`, `onAccent`;
- `positive`, `positiveSurface`, `onPositiveSurface`;
- `warning`, `danger`.

Subject-specific factual colors, such as an exact palette swatch or national flag, remain literal data and must not
be remapped by the theme.

## Appearance Presets

Presets are starting points, not locked designs. Use [the preset library](./assets/presets.json).

| Preset | Shape and stroke character | Typical use |
| --- | --- | --- |
| `casual` | generous curves, round caps, slightly heavier strokes, lively accents, comfortable spacing | explainers, workshops, community docs |
| `formal` | restrained radius, precise thin strokes, compact spacing, limited palette, minimal depth | reports, policy, enterprise architecture |
| `sharp` | near-square corners, square caps, miter joins, high contrast, taut spacing | engineering, cyber, technical systems |
| `simple` | one accent, moderate small radius, thin uniform strokes, flat depth, generous whitespace | broad-purpose docs and accessibility-first figures |
| `friendly` | rounded containers and pills, round joins, warm supporting surfaces, clear positive states | onboarding, education, product storytelling |

Do not let a preset change factual hierarchy or data encoding. Personality changes presentation, not meaning.

## Workflow

### 1. Capture constraints

Determine:

- host brand colors and forbidden colors;
- required modes: light, dark, print, high contrast, or custom names;
- embedding profile: inline web, external image, standalone, Office, or print;
- desired personality and density;
- fonts available in the target;
- contrast target and any color-vision requirements.

### 2. Build light mode deliberately

- Choose canvas and surface hierarchy first.
- Choose primary and muted text against those surfaces.
- Derive structural lines and grids with sufficient non-text contrast where they carry meaning.
- Add one primary accent and one optional secondary accent.
- Add semantic status colors only when the illustration uses those states.

### 3. Build dark mode independently

- Use dark surfaces with controlled luminance steps; avoid pure black everywhere.
- Increase line and muted-text luminance enough to remain legible.
- Reduce accent saturation or increase lightness when bright colors vibrate on dark surfaces.
- Recheck on-accent text; a light-mode accent may need a different dark-mode value.
- Preserve semantic relationships, not identical hex values.

### 4. Apply appearance

Map the selected preset into generator or component parameters:

- corner and pill radius;
- primary, secondary, and connector stroke widths;
- line caps, joins, and optional dash pattern;
- typography family and weight contrast;
- spacing/density scale;
- flat, outlined, layered, or restrained-shadow depth.

### 5. Select an embedding strategy

- **Inline web SVG:** use CSS custom properties; host `[data-theme]` selectors override values.
- **External SVG with host-controlled theme:** generate `*-light.svg` and `*-dark.svg`; host swaps `src` using
  `data-src-light` and `data-src-dark`.
- **Standalone/system theme:** embed `@media (prefers-color-scheme: dark)` when the profile permits `<style>`.
- **Office/print/sanitized fixed output:** emit one explicit variant per mode; do not depend on CSS inheritance.

### 6. Validate

Run:

```powershell
python scripts/validate_theme.py path/to/theme.json
```

Then render the same representative illustrations in every mode and at every target size. Theme validation cannot
detect crowding caused by heavier strokes, larger radii, font substitution, or denser spacing.

## Customization Rules

- Users may replace any semantic color while keeping the token name stable.
- Users may start from one appearance preset and override individual values.
- Keep theme configuration separate from illustration content/data.
- A theme change must not alter measured values, topology, text, or accessibility alternatives.
- Re-run contrast and visual validation after every customization.
- Store the theme file and preset name beside deterministic illustration generators.

## Quality Gate

- Light and dark modes contain every required semantic role.
- Text contrast is at least 4.5:1 for normal text; meaningful structural graphics reach 3:1.
- Information does not depend on color alone.
- On-accent and on-positive text are validated against their exact surfaces.
- Every external themed image has both variants and a host/system selection mechanism.
- Appearance values are internally coherent and supported by the target profile.
- Theme changes preserve geometry, content, and visual hierarchy.
- Representative assets were rendered and inspected in every supported mode.

## Resources

- [Theme contract](./references/theme-contract.md): token meanings, mode design, embedding, and generator integration.
- [Theme template](./assets/theme-template.json): complete customizable light/dark theme.
- [Preset library](./assets/presets.json): casual, formal, sharp, simple, and friendly appearance parameters.
- [Theme validator](./scripts/validate_theme.py): completeness, value, and contrast checks.