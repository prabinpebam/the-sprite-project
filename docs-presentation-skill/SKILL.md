---
name: docs-presentation
title: Documentation-Presentation (Slate)
description: Turn raw content into a beautiful, navigable, visual-first static documentation site. Use when asked to format, organize, or present provided content (notes, transcripts, Markdown, extracted docs) as structured, viewable pages, or to build a documentation site/viewer from content. Uses custom validated SVG for static visuals and specialist AntV knowledge only when advanced chart, graph, table, or editor semantics are needed.
version: 0.2.0
---

# Documentation-Presentation Skill (Slate)

Turn raw content into a beautiful, navigable, **static** documentation site. You (the agent) read
this file, take the user's raw content, and generate:

- one **page** per topic (`.html` for rich layout, `.md` for prose, or a mix),
- **visualizations** (charts, diagrams, infographics) for anything that carries data, structure,
  or relationships - embedded as figures,
- a **`docs-manifest.json`** listing every page,
- an optional **`slate.config.json`** for branding,

then copy the `shell/` and `assets/` folders next to them. **You never edit the shell or write CSS or
JavaScript.** You compose pages from the documented component vocabulary in
[`components/`](components/README.md) and from the visualization skills in
[`visualization/`](visualization/README.md).

## Prime directive: visual-first

> **A big part of good documentation is how well information is *represented*. Default to showing,
> not telling.** Whenever content contains numbers, trends, comparisons, proportions, processes,
> hierarchies, relationships, flows, distributions, or structured entities - **represent it as a
> visualization**, not a paragraph. Prose is the fallback, used only when a visual would not add
> clarity.

Apply a **heavy bias toward visuals**:

- If a sentence describes a quantity or change ("CSAT fell from 72% to 59%") → make a **chart**.
- If it lists steps or phases → make a **steps/flow** visual.
- If it compares options → make a **comparison** or a grouped **bar/radar** chart.
- If it describes parts of a whole → **pie/treemap**.
- If it describes a network, org, or dependency → a **graph/org/mind-map**.
- If it is a narrative packed with entities and metrics → a **narrative-text visualization** or an
  **infographic**.
- Only if none of these fit → prose primitives.

Every page should aim to **lead with or prominently feature at least one visualization** when the
source content supports it.

## When to use this skill (trigger)

Use this skill when the user asks to:

- turn content into a navigable documentation site or viewer,
- format / organize / present provided content into structured, viewable pages,
- convert notes, transcripts, or extracted documents into a clean, **visual** docs experience.

## Inputs

- Raw content: Markdown, notes, transcripts, extracted docs, plain prose, tables, datasets.
- Optional branding: project name, logo, brand color, default theme.

## Outputs

- `*.html` (rich) and/or `*.md` (prose) pages - one per topic - as **body fragments** (no `<head>`).
- **Visualization assets** saved under an `assets/` folder next to the pages (e.g.
  `assets/charts/*.svg` / `*.png`), embedded via the figure component.
- `docs-manifest.json` - validated against [`schema/manifest.schema.json`](schema/manifest.schema.json).
- Optional `slate.config.json` - validated against [`schema/config.schema.json`](schema/config.schema.json).
- The copied `shell/` and `assets/` folders (unchanged).

## Procedure (deterministic - follow in order)

1. **Ingest** the content; identify topics → one page per topic.
2. **Outline** each page: title, TL;DR, section hierarchy (H2/H3).
3. **Visualize first (per section).** For every section, ask: *does this carry data, structure, or
   relationships?* If yes, choose a visualization from the **decision matrix** below, produce it
   with the matching visualization skill, save the asset, and embed it as a figure. Do this
   **before** reaching for text components.
4. **Select components** for the non-visual remainder from the catalog, matching content shape to
   component.
5. **Generate** each page from [`templates/page.html`](templates/page.html) (or `templates/landing.html`
   for an overview), filling slots with visualizations and catalog component markup.
6. **Build the manifest** with `order`/`group` reflecting the reading sequence.
7. **Apply branding** via `slate.config.json` if a name/logo/brand color is provided.
8. **Self-validate** against the checklist below; fix issues.
9. **Stop.** The user reviews in the viewer. Invent no content or data beyond the inputs.

## Visualization decision matrix - content shape → visual → skill

Choose the visual whose shape matches the content. Follow the centralized
[visualization ownership policy](visualization/ROUTING.md): `svg-illustration` owns final static
assets; AntV skills supply specialist semantics or own genuinely interactive deliverables. All
static visuals are embedded as **figures** (see "Embedding a visualization").

| If the content is… | Represent it as | Use skill |
| --- | --- | --- |
| Static trend, comparison, proportion, distribution, correlation, or progress | Accessible chart SVG; consult G2 for nontrivial encoding/scale/transform choices | [svg-illustration](visualization/skills/svg-illustration/SKILL.md) |
| Static flow, conversion, hierarchy, cause/effect, architecture, lifecycle, or roadmap | Art-directed SVG whose geometry mirrors the concept | [svg-illustration](visualization/skills/svg-illustration/SKILL.md) |
| Static infographic, narrative visual, annotated scene, mechanism, object, person, or map | Custom accessible SVG illustration | [svg-illustration](visualization/skills/svg-illustration/SKILL.md) |
| Interactive statistical chart or advanced statistical implementation | AntV **G2** runtime | [antv-g2-chart](visualization/skills/antv-g2-chart/SKILL.md) |
| Dense or interactive network / graph | AntV **G6** runtime | [antv-g6-graph](visualization/skills/antv-g6-graph/SKILL.md) |
| Interactive pivot table / multidimensional analysis | AntV **S2** runtime | [antv-s2-expert](visualization/skills/antv-s2-expert/SKILL.md) |
| Interactive node/edge editor | AntV **X6** runtime | [antv-x6-editor](visualization/skills/antv-x6-editor/SKILL.md) |
| Quick disposable chart/infographic prototype | AntV API/DSL, explicitly not the final docs asset | [chart-visualization](visualization/skills/chart-visualization/SKILL.md) |
| Need an icon for a card/tile/infographic | Icon lookup | [icon-retrieval](visualization/skills/icon-retrieval/SKILL.md) |

**Default static path:** use [svg-illustration](visualization/skills/svg-illustration/SKILL.md),
save the source data or deterministic generator when appropriate, validate the SVG, render it in
the real docs context, and inspect it before delivery. Never ship an uninspected library export.

## Embedding a visualization in a page

The viewer is static and sanitized: **no `<script>`, no `<iframe>`, no `<style>` in content.** So
visualizations are embedded as **static assets** - an image or inline SVG - inside the **figure**
component. (Interactive/library charts are authored, then **exported** to SVG/PNG.)

Rules:

- **Save the asset locally.** If a skill returns a remote image URL, download it into
  `assets/charts/` and reference the local path so the site stays offline-capable and versioned.
- **Prefer `<img>` for exported charts** (self-contained). Use **inline `<svg>`** only for simple
  graphics that use presentation attributes (`fill=`, `stroke=`) - the sanitizer strips `<style>`
  inside SVG, so `<style>`-based SVG must be rasterized/exported to PNG or converted to attributes.
- **Meaningful `alt`** stating the *takeaway*, not just the chart type.
- **Caption** with `<figcaption>` for context/source.
- **Text alternative + searchability:** include the underlying numbers as a collapsible data table
  right after the figure. This satisfies accessibility and makes the data findable by search.
- Figures get **zoom (lightbox) for free** - the shell enlarges `.slate-figure img` on click.

Canonical embed:

```html
<figure class="slate-figure">
  <img src="assets/charts/csat-q1-drop.svg"
       alt="Line chart: CSAT fell from ~72% in Q4 to ~59% in Q1 2026; DSAT rose ~22% to ~33%." />
  <figcaption>CSAT declined ~13 points quarter over quarter (source: Q1 sample, &lt;2,000 responses).</figcaption>
</figure>
<details class="slate-figure-data">
  <summary>Data</summary>
  <table>
    <thead><tr><th>Quarter</th><th>CSAT</th><th>DSAT</th></tr></thead>
    <tbody>
      <tr><td>Q4</td><td>72%</td><td>22%</td></tr>
      <tr><td>Q1</td><td>59%</td><td>33%</td></tr>
    </tbody>
  </table>
</details>
```

## Component catalog - content shape → component

Reach for a **visualization first** (matrix above). Use these components for structure and for
content that is genuinely non-visual.

| If the content is… | Use | Example |
| --- | --- | --- |
| **Any data/relationship/process** | **Visualization (figure)** | see matrix above |
| A big number / KPI | Metric tile | [metric-tile.html](components/metric-tile.html) |
| A one-line summary of the page | TL;DR band | [tldr.html](components/tldr.html) |
| A page title + lead-in | Hero | [hero.html](components/hero.html) |
| An image needing a caption | Figure | [figure.html](components/figure.html) |
| A set of parallel items/links | Card grid | [card-grid.html](components/card-grid.html) |
| An ordered procedure or phases | Steps / Timeline | [steps.html](components/steps.html) |
| Two options side by side | Comparison | [comparison.html](components/comparison.html) |
| An aside/warning/tip | Callout | [callout.html](components/callout.html) |
| A status/label word | Badge | [badge.html](components/badge.html) |
| Key/value specs | Definition list | [defs.html](components/defs.html) |
| Tabular data (that is not better as a chart) | Table | [table.html](components/table.html) |
| Code | Fenced code block (Markdown) | - |

If the content needs something not covered, choose the closest visual/component or fall back to
prose - and flag the gap to the user.

## Visualization skills (bundled)

Bundled under [`visualization/`](visualization/README.md). Use
[`visualization/ROUTING.md`](visualization/ROUTING.md) to avoid duplicated responsibilities.
AntV skills retain their MIT attribution and act as specialists; the project-authored SVG skill
owns final static documentation visuals.

| Skill | Use for | Path |
| --- | --- | --- |
| svg-illustration | **Default static owner:** charts, diagrams, infographics, subjects, scenes, maps, validation, and QA | [visualization/skills/svg-illustration/SKILL.md](visualization/skills/svg-illustration/SKILL.md) |
| svg-theme-system | Semantic color themes, light/dark variants, brand customization, and visual personality presets | [visualization/skills/svg-theme-system/SKILL.md](visualization/skills/svg-theme-system/SKILL.md) |
| antv-g2-chart | Statistical specialist; final owner only for interactive G2 | [visualization/skills/antv-g2-chart/SKILL.md](visualization/skills/antv-g2-chart/SKILL.md) |
| antv-g6-graph | Graph-layout specialist; final owner only for interactive/dense G6 | [visualization/skills/antv-g6-graph/SKILL.md](visualization/skills/antv-g6-graph/SKILL.md) |
| antv-s2-expert | Final owner for interactive pivot/cross-analysis tables | [visualization/skills/antv-s2-expert/SKILL.md](visualization/skills/antv-s2-expert/SKILL.md) |
| antv-x6-editor | Final owner for interactive node/edge editors | [visualization/skills/antv-x6-editor/SKILL.md](visualization/skills/antv-x6-editor/SKILL.md) |
| chart-visualization / infographic / T8 | Opt-in prototypes, not default static output | [visualization/README.md](visualization/README.md) |
| icon-retrieval | Find icons for cards/tiles/infographics | [visualization/skills/icon-retrieval/SKILL.md](visualization/skills/icon-retrieval/SKILL.md) |

Attribution: original work © 2025 AntV Visualization Team, MIT License. See
[`visualization/LICENSE`](visualization/LICENSE) and [`visualization/NOTICE`](visualization/NOTICE);
these files MUST be kept when the skill is copied.

## Hard rules

1. **Visual-first.** Prefer a visualization over prose for any data, trend, comparison,
   proportion, process, hierarchy, relationship, distribution, or entity-rich narrative. Prose is
   the fallback.
2. **Every visual has a text alternative.** Meaningful `alt` + an underlying data table (or
   equivalent prose) so the information is accessible and searchable. Never present a chart as the
   *only* carrier of a fact.
3. Compose **only** from catalog components and embedded visual assets. Never invent CSS, never
   write `<style>`/`<script>` in content, never use inline `style=`. Visuals are embedded as
   **static images or inline SVG** inside a figure - never as live scripts or iframes.
4. Author **body fragments**, not full HTML documents. The shell owns `<head>`, theme, and layout.
5. Exactly **one H1** per page. H2/H3 drive the TOC and collapsible sections.
6. Pick format per page: prose-heavy → Markdown; layout/visual → HTML; mixed when needed.
7. Every page **leads with a TL;DR** band, and features a visualization when the content supports it.
8. **Save visualization assets locally** under `assets/`; reference relative paths.
9. Links are **relative** to real content paths; the runtime rewrites them to hash routes.
10. **Update `docs-manifest.json`** for every page (path, title, order, group).
11. **Preserve source material** - generate alongside inputs, never overwrite them. Keep the
    bundled `visualization/LICENSE` and `visualization/NOTICE`.
12. **Accessibility**: alt text on every image/chart, semantic markup, keyboard-reachable components.
13. **No emoji** - use the icon set in [`assets/icons/`](assets/icons/) or
    [icon-retrieval](visualization/skills/icon-retrieval/SKILL.md).
14. **No fabrication** - every fact, number, and data point must trace to the provided inputs. Do
    not invent data to make a nicer chart.

## Self-validation checklist (run before finishing)

- [ ] One H1 per page; logical H2/H3 nesting.
- [ ] **Every section carrying data/structure/relationships is visualized** (or a deliberate,
      justified exception).
- [ ] Every visualization is a figure with meaningful `alt`, a caption, and an underlying data
      table (or prose) alternative.
- [ ] Every static SVG passes its production-profile validator and has been rendered and visually
  inspected at the actual documentation width.
- [ ] Visualization assets are saved under `assets/` and referenced by relative path (no
      unresolved remote-only images).
- [ ] Only catalog components + embedded static visuals used; no inline styles/scripts/iframes.
- [ ] TL;DR present on every page.
- [ ] Every page is in the manifest, in a sensible order.
- [ ] All internal links resolve; all images have alt text and resolve.
- [ ] Renders legibly in light, dark, narrow, and wide documentation contexts as applicable.
- [ ] Manifest validates against `schema/manifest.schema.json`; config (if any) against
      `schema/config.schema.json`.
- [ ] No fabricated facts or data - everything traces to the inputs.

## Worked example

See [`examples/before.md`](examples/before.md) (raw input) →
[`examples/after.html`](examples/after.html) (generated page) and
[`examples/docs-manifest.json`](examples/docs-manifest.json). Imitate this structure, and add a
visualization for any data the example carries.

## Reference

This skill implements the [Slate specification suite](../specs/README.md) plus the bundled
[visualization skills](visualization/README.md). You do **not** need to read `shell/` source to use
the skill - the catalog, templates, schemas, and visualization skills are sufficient.
