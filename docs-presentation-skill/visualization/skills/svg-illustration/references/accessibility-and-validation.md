# Accessibility and Validation

Accessibility depends on the SVG’s purpose and embedding method. Visual validation is separate: a semantically valid
SVG can still be clipped, illegible, misleading, or blank.

## Classify the Graphic

### Decorative

The visual adds no information beyond adjacent content.

- inline: `aria-hidden="true"` and no focusable descendants;
- external `<img>`: `alt=""`;
- prefer CSS backgrounds for purely decorative web imagery;
- do not add verbose titles that create screen-reader clutter.

### Simple informative

The graphic conveys one concise idea.

```xml
<svg role="img" aria-labelledby="diagram-title" viewBox="0 0 600 400">
  <title id="diagram-title">Three stages of sprite export</title>
  ...
</svg>
```

When embedded via `<img>`, use the HTML `alt` attribute instead.

### Complex informative

Charts, diagrams, maps, mechanisms, and illustrations with substantial structure need two levels:

1. a short name/takeaway;
2. a structured long description in adjacent HTML or documentation.

Use `<desc>` for a compact summary, but do not put a table or long structured explanation only in `<desc>` or
`aria-describedby`; assistive technology may flatten its structure. Provide visible prose, lists, or a data table
next to the figure and refer to it from the short alternative.

### Interactive

If internal elements are controls:

- use native HTML controls around the SVG when practical;
- otherwise provide focusability, role, accessible name, keyboard activation, visible focus, and equivalent state;
- ensure pointer and keyboard interactions have the same result;
- make hit areas large enough without obscuring semantics;
- announce dynamic changes appropriately in surrounding HTML.

## Accessible Naming

For inline informative SVG:

```xml
<svg role="img" aria-labelledby="asset-flow-title asset-flow-desc" viewBox="0 0 800 500">
  <title id="asset-flow-title">Character assets moving from packs to Godot</title>
  <desc id="asset-flow-desc">Pack layers are composed, recolored, saved as a recipe, and exported with credits.</desc>
  ...
</svg>
```

- Put `<title>` immediately after the opening `<svg>`.
- Use unique IDs when multiple SVGs may be inlined.
- Keep the short title useful out of context.
- Describe the conclusion and reading order, not every decorative shape.

## Text Alternatives for Complex Visuals

A useful long description includes the essential:

- purpose and main takeaway;
- organization and reading order;
- entities and meaningful relationships;
- values, trends, exceptions, or uncertainty;
- spatial composition when position carries meaning;
- source and limitations where relevant.

For data-bearing visuals, include the source data as a table or structured list. For technical diagrams, include the
important sequence, boundaries, and relationship semantics in prose.

## Contrast and Non-color Encoding

- Target at least 4.5:1 for normal text and 3:1 for large text and essential graphical objects under WCAG AA.
- Test actual foreground/background pairs, including transparency and gradients.
- Do not use color alone for categories or state. Pair it with shape, line dash, label, pattern, icon, position, or
  direct annotation.
- Avoid legends when direct labels can identify marks more clearly.
- Check grayscale and common color-vision-deficiency simulations when category color carries substantial load.

## Typography and Magnification

- Preserve real text where possible so it can scale and be selected.
- Test at the smallest intended rendered size and at browser zoom.
- Avoid essential text along steep curves or vertical axes.
- Ensure line spacing and container padding survive font substitution.
- Do not encode critical content only as tiny annotations.

## Motion

- Provide a useful static state.
- Respect `prefers-reduced-motion` in web profiles.
- Avoid flashing content and rapid high-contrast changes.
- Provide pause/stop controls for continuous meaningful animation.
- Do not make comprehension depend on catching a transient frame.

## Structural Validation

Run `scripts/validate_svg.py` before rendering. It checks a conservative baseline:

- well-formed XML and SVG root;
- valid positive `viewBox`;
- duplicate IDs and dangling `href`/`url(#...)` references;
- accessible name requirements by mode;
- script/event handlers and external resources;
- profile-specific unsupported elements/features;
- missing reduced-motion handling when CSS animation is detected.

It does not prove WCAG conformance, visual quality, factual accuracy, safe sanitization, or target compatibility.

## Mandatory Visual Validation Loop

### 1. Render

Render the real SVG, not a manually recreated preview. Prefer the actual embedding context. Capture a PNG at the
intended size and, for dense work, a larger inspection size.

### 2. Inspect conceptual quality

- Does the first glance reveal the visual thesis?
- Is the reading order obvious?
- Does the spatial structure match the relationships?
- Are visual hierarchy and emphasis faithful to the content?
- Are real evidence and important exceptions visible?
- Does the image add understanding beyond the accompanying prose?

### 3. Inspect defects

- blank or partially rendered output;
- clipped strokes, labels, shadows, filters, markers, and symbols;
- text overflow, fallback-font reflow, or unreadably small type;
- accidental overlaps and near-tangencies;
- connectors crossing nodes, labels, or one another;
- wrong endpoints, arrow directions, or relationship labels;
- inconsistent alignment, spacing, and optical weight;
- large empty voids or crowded clusters;
- low contrast and color-only distinctions;
- broken silhouettes, anatomy, perspective, or layer order;
- unsupported target features.

### 4. Inspect responsive behavior

- smallest expected width;
- normal display width;
- large/print width;
- narrow container with `meet` behavior;
- theme variants when applicable.

Do not accept a layout that only works at the authoring zoom level.

### 5. Revise

Change the smallest controlling cause: composition, zone size, label wrap, connector route, viewBox margin, palette,
or unsupported feature. Re-render after every substantive correction. After three unsuccessful local correction
rounds, reconsider the composition or medium.

## Programmatic Checks Worth Adding in Host Projects

Depending on risk and tooling:

- XML parsing and schema/profile linting;
- duplicate-ID and dangling-reference detection;
- Playwright screenshot tests at multiple sizes/themes;
- bounding-box checks for elements outside the viewBox;
- computed contrast checks for known fill/text pairs;
- pixel checks for nonblank output;
- axe-core checks for surrounding HTML and interactive controls;
- snapshot or semantic checks for generated labels and data values;
- deterministic-output checks for generated SVG.

## Factual and Ethical Review

- Verify labels, values, relationships, chronology, and source attribution.
- Distinguish observed data from projection and metaphor.
- Do not imply geographic scale, causation, certainty, or hierarchy that the source does not support.
- Avoid stereotypes and stigmatizing visual metaphors.
- Record licenses for icons, fonts, images, and source artwork.
- Do not trace copyrighted artwork or imitate a living artist’s distinctive style.

## Final Review Record

For consequential visuals, record:

```text
Source SVG:
Production profile:
Rendered sizes tested:
Themes/targets tested:
Structural validator result:
Accessibility mode and text alternative:
Visual issues found and corrected:
External assets and licenses:
Known limitations:
```