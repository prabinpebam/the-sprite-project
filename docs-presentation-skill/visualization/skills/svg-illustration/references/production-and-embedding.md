# Production and Embedding

SVG support varies by destination. Pick a profile before using CSS, filters, masks, markers, animation, fonts, or
external resources.

## Core SVG Contract

Every SVG should have:

- the SVG namespace;
- a `viewBox` defining its logical coordinate system;
- intentional `preserveAspectRatio` behavior;
- content within the viewBox including stroke/filter extents;
- scoped, unique IDs;
- an accessibility mode: informative, complex, decorative, or externally labeled;
- no external dependency unless the delivery contract explicitly permits it.

### Responsive sizing

Use `viewBox="minX minY width height"` as the source of aspect ratio and internal coordinates.

- `xMidYMid meet`: preserve ratio and show the entire illustration; default for diagrams and figures.
- `xMidYMid slice`: preserve ratio and fill the viewport by cropping; use only for art-directed backgrounds.
- `none`: stretch non-uniformly; avoid for subjects, diagrams, icons, and most illustrations.

For responsive web use, omit fixed `width`/`height` when the container controls size, or provide intrinsic dimensions
plus CSS `width: 100%; height: auto`. For print or Office, explicit dimensions may improve predictability.

## Production Profiles

### `docs-inline`

For sanitized documentation fragments such as this repository’s Slate pages:

- use presentation attributes (`fill`, `stroke`, `font-size`) rather than embedded `<style>`;
- no `<script>`, event attributes, `foreignObject`, external images, external fonts, or remote references;
- avoid filters, masks, and renderer-sensitive blend modes;
- simple gradients, clip paths, symbols, and markers only after confirming the sanitizer preserves them;
- prefer explicit polygon arrowheads if marker support is uncertain;
- keep all visible text in native `<text>` elements;
- provide nearby prose/table alternatives for complex visuals.

### `web-inline`

- use semantic classes and CSS custom properties where they improve theming;
- scope IDs and selectors because multiple SVGs share the same document;
- prefer `currentColor` for single-color symbols;
- use inline `<title>`/`<desc>` or visible HTML labels;
- interaction must be keyboard-accessible and have visible focus;
- test CSS and URL references after any framework sanitization or ID rewriting.

### `standalone`

- include everything required to render offline;
- internal `<style>` and definitions are acceptable;
- embed raster images as data URLs only when size and licensing allow;
- avoid remote fonts and resources unless explicitly requested;
- test opening directly in at least one browser and in the intended consumer.

### `office`

Optimize for broad import compatibility:

- use inline presentation attributes rather than complex CSS;
- prefer `rect`, `circle`, `ellipse`, `line`, `polyline`, `polygon`, and moderate `path` data;
- use polygons instead of marker arrowheads when portability matters;
- avoid `foreignObject`, filters, masks, blend modes, scripts, SMIL, and nested external SVG;
- use simple linear/radial gradients sparingly;
- keep labels as `<text>` for editability and provide an outlined-text variant only when exact appearance is required;
- use common font fallbacks and verify import into the actual Office application.

### `print`

- set explicit physical size when required (`mm`, `in`, or points in the consuming workflow);
- verify font embedding/substitution and CMYK conversion in the downstream PDF/print pipeline;
- avoid effects that rasterize unexpectedly;
- inspect hairlines and small reversed text at print size;
- provide outlined and editable variants when the production workflow requires both.

### `icon`

- use a standard viewBox and no embedded text;
- align to target pixel sizes and use optical correction;
- prefer simple strokes/fills and minimal definitions;
- test at all final sizes, including high-contrast and disabled states if applicable;
- expose color through `currentColor` when the icon is a UI glyph.

## IDs, Definitions, and Reuse

Inline SVG IDs share the HTML document namespace. Prefix all reusable IDs:

```xml
<linearGradient id="sprite-pipeline__accent-gradient">...</linearGradient>
<path fill="url(#sprite-pipeline__accent-gradient)" ... />
```

Keep IDs stable and semantic until final optimization. Check all `url(#id)` and `href="#id"` references after
editing. Reuse geometry with `<symbol>` and `<use>` for repeated icons and marks, but test Office/sanitizer support.

## Text and Fonts

- Use system or project-approved font stacks unless embedding is explicitly allowed.
- SVG has no native paragraph layout. Author line breaks with `<tspan>`.
- Do not use `foreignObject` merely to gain HTML wrapping; it compromises portability.
- Do not assume font metrics are identical across systems. Leave horizontal and vertical safety space.
- Use `textLength` only for controlled adjustment, not to crush long labels into fixed boxes.
- Keep critical labels editable. Outlined text is a portability fallback, not the default.

## Images

Prefer vector construction when appropriate. When raster imagery is necessary:

- use local files or embedded data URLs according to the profile;
- declare dimensions and `preserveAspectRatio`;
- provide licensing/source metadata outside the SVG;
- do not hotlink remote images;
- verify that the asset survives export and offline viewing.

## Clipping, Masks, and Filters

Use effects only when they add explanatory value and the profile supports them.

For clipped containers, use three layers:

1. background shape;
2. clipped content;
3. border drawn last.

Expand filter regions to prevent cropped blur or shadow. When portability matters, replace filters with explicit
offset shapes, flat plane values, hatching, or line work.

## Animation

Static clarity comes first. Animation should reveal sequence, state, direction, causality, or attention.

Prefer CSS for opacity, color, stroke, and transforms in web profiles. Use SMIL only when the target explicitly
supports it and attribute/path animation is required. Never animate Office/docs-inline output.

Rules:

- separate static position and animated transform into nested groups;
- use restrained durations and easing; avoid constant motion without purpose;
- provide a meaningful static first frame;
- stop or simplify animation under `prefers-reduced-motion: reduce`;
- avoid flashing and large parallax movement;
- interactive animation requires keyboard-equivalent controls and a pause mechanism when it continues automatically.

## Deterministic Generation

For repeated, procedural, or data-driven SVG:

- fix and record the random seed;
- sort input entities and output attributes consistently;
- derive stable IDs from semantic names, not iteration timing;
- separate data, layout calculation, and rendering;
- round numbers only after layout;
- save the source data/config beside the generated SVG when reproducibility matters.

## Optimization

Optimize only after visual approval.

Safe wins:

- remove editor metadata and unused namespaces;
- remove hidden leftovers and unused definitions;
- reduce excessive decimal precision;
- reuse repeated geometry;
- simplify auto-traced paths while preserving silhouette;
- remove empty groups and comments that have no maintenance value.

Preserve:

- `viewBox` and intentional dimensions;
- `<title>`, `<desc>`, roles, and referenced IDs;
- editability and semantic grouping when part of the deliverable;
- required whitespace in text content;
- path geometry needed for morphing or exact alignment.

SVGO is useful, but review its configuration. Never enable transformations blindly on an editable master.

## Export

Keep the SVG as the source of truth. Produce exports from that source:

- PNG at the exact required dimensions and at 2x when a high-density raster is useful;
- PDF through a browser or vector-aware renderer, followed by font/effect inspection;
- presentation import by testing the SVG directly in the target application;
- optimized delivery SVG as a derivative, not the only editable copy.

## Embedding Patterns

### Inline in HTML

Best for theming and accessibility. Ensure scoped IDs and sanitized content.

### `<img src="...svg" alt="...">`

Best for isolation and caching. Put the accessible text in `alt`; do not rely on internal SVG semantics being
announced.

### `<object data="...svg">`

Allows internal interaction but complicates accessibility, styling, and security. Use only when required.

### CSS background

Use for decorative visuals only. Information-bearing SVG must have an accessible equivalent in content.

## Compatibility Test Matrix

At minimum, test the actual target. For reusable assets, consider:

- Chromium and Firefox for web;
- light and dark contexts;
- narrow and wide containers;
- sanitizer output for documentation systems;
- PowerPoint or Word for Office assets;
- PDF/print preview for print assets;
- direct-file opening for standalone assets.

Markup validation cannot substitute for these rendering checks.