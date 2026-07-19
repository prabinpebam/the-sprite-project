---
name: svg-illustration
description: "Singular visual pipeline for identifying visualization opportunities and creating polished, accessible, themeable, optionally animated SVGs: charts, data stories, diagrams, architecture, processes, infographics, editorial scenes, people, objects, maps, icons, patterns, and generative work. Use for visual explanation, custom vector art, deterministic data figures, brand/light/dark themes, visual personality, or tasteful SVG motion. Routes away when SVG is not the right medium and requires render-inspect-fix validation."
---

# SVG Illustration

Create SVGs that explain, depict, or persuade through visual structure. Do not merely translate nouns into equal
boxes. The geometry, hierarchy, color, and reading path must express the subject.

## Non-negotiable Principles

1. **Choose the medium before drawing.** SVG is not automatically the best answer.
2. **State one visual thesis.** Write the single idea the image must make obvious at a glance.
3. **Make structure resemble meaning.** Use convergence for aggregation, branching for alternatives, enclosure for
   containment, sequence for time, proximity for affinity, and scale for importance.
4. **Design the silhouette and composition before detail.** Recognition and eye flow beat decoration.
5. **Use concrete evidence.** Real labels, values, examples, states, or artifacts are better than generic boxes.
6. **Encode meaning redundantly.** Never depend on color alone; pair it with shape, position, pattern, line style,
   label, or icon.
7. **Target the actual renderer.** Web, sanitized inline HTML, Office, print, and icon pipelines support different SVG.
8. **Render and inspect.** Valid XML can still be a bad image. Never deliver an unrendered SVG.

## Route the Request

Read [visual routing](./references/visual-routing.md) before choosing a format. If source material contains
quantities, trends, distributions, flows, networks, or multidimensional analysis, also read
[data visualization](./references/data-visualization.md) before selecting an encoding.

Use this skill for custom static or lightly animated vector work where art direction and exact composition matter:

- explanatory, conceptual, educational, or editorial illustrations;
- architecture, process, lifecycle, system, and relationship diagrams needing custom layout;
- visual summaries, annotated scenes, cutaways, maps, spatial models, and comparison illustrations;
- people, animals, objects, environments, icons, symbols, patterns, and generative vector compositions;
- branded visuals or diagrams that must not look like a default diagram template.

Prefer another medium when its core engine solves the hard part better:

- **Mermaid / PlantUML / Graphviz:** formal notation or dense graph auto-layout matters more than art direction.
- **A chart library:** quantitative comparison, distribution, uncertainty, or interaction is the main task.
- **HTML/CSS:** responsive text-heavy UI, dashboard, or document layout.
- **Canvas / WebGL / Three.js:** simulation, thousands of moving marks, 3D, particles, or continuous interaction.
- **Excalidraw / tldraw:** editable whiteboard collaboration or a deliberately hand-drawn artifact.
- **Bitmap imagery:** photorealism, painterly texture, or complex natural detail dominates.

## Establish the Production Profile

Before authoring, identify the destination. Ask only if the target changes the implementation and cannot be inferred.

| Profile | Default implementation |
| --- | --- |
| `docs-inline` | Presentation attributes; no script, `foreignObject`, external assets, or embedded `<style>`; avoid filters and masks |
| `docs-animated` | Self-contained external SVG via `<img>`; embedded CSS allowed; no script/SMIL/external resources; reduced-motion fallback required |
| `web-inline` | Semantic groups, CSS variables/classes allowed, scoped IDs, optional restrained CSS animation |
| `standalone` | Self-contained SVG; embedded style/fonts only when licensing and portability allow |
| `office` | Inline attributes, editable `<text>`, simple geometry; avoid markers, filters, masks, and fragile CSS |
| `print` | Vector-safe effects, embedded or outlined licensed fonts, explicit physical dimensions when required |
| `icon` | Pixel-grid-aware viewBox, minimal paths, no text, tested at each target size |

Read [production and embedding](./references/production-and-embedding.md) for exact constraints.
For customizable colors, light/dark modes, and casual/formal/sharp/simple/friendly personalities, read the internal
[theme contract](./references/theme-contract.md). Keep semantic theme values separate from content and geometry.
For optional animation, read [motion and animation](./references/motion-and-animation.md) only after the static
composition is approved.

## Required Workflow

### 1. Model the truth

- Inventory entities, relationships, sequence, hierarchy, quantities, states, and uncertainty.
- Separate sourced facts from visual interpretation. Never invent values or causal links for a nicer image.
- For technical subjects, inspect the actual code, schema, protocol, or source material first.
- Decide what a viewer should understand after 3 seconds, 30 seconds, and close inspection.

### 2. Write the visual brief

Record these decisions before markup:

```text
Audience:
Visual thesis:
Content that must be visible:
Reading order:
Visual form / metaphor:
Production profile and final size:
Color theme and required modes:
Visual personality / preset:
Motion purpose and runtime (or static):
Accessibility mode: informative | complex | decorative
```

### 3. Choose a composition

Use [composition and layout](./references/composition-and-layout.md).

- Pick a dominant structure: path, field, layers, radial system, comparison, hierarchy, spatial scene, or focal object.
- Sketch major zones and connectors before details.
- Establish hierarchy with position and scale first, then typography and color.
- Allocate safe margins and label space. Avoid uniform card grids unless equal comparison is genuinely the message.
- For dense material, use multi-zoom structure: overview, grouped regions, then evidence-level detail.
- For measured data, declare scale, domain, ordering, units, transformations, uncertainty, and qualitative versus
   quantitative status before drawing marks.

### 4. Choose a visual language

- Use the theme contract when the visual must be customizable or support multiple modes. Keep semantic theme values
   separate from content and geometry.
- Derive a small palette from the product or subject; assign colors semantic roles rather than scattering literals.
- Define type roles, spacing unit, stroke family, corner language, icon style, and depth model, or select a documented
   appearance preset.
- Use one dominant visual motif and at most two supporting motifs.
- Keep decoration subordinate to explanation.
- If illustrating a real subject, use [illustration techniques](./references/illustration-techniques.md): silhouette,
  proportions, anatomy/construction, perspective, overlap, lighting, then detail.

### 5. Plan optional motion

- Finish and approve the static visual first.
- State what motion proves: sequence, causality, state, direction, hierarchy, or attention.
- Compose two to four atomic moves: establish, ordered reveal/change, proof emphasis, settle/hold.
- Choose CSS, WAAPI, SMIL, or a host timeline from the production profile; use one deterministic clock.
- Define first, proof, final, and reduced-motion states before implementation.
- Avoid ambient wobble, infinite decorative loops, random timing, and layout-property animation.

### 6. Construct in semantic layers

Use stable, readable IDs and group by meaning rather than by element type.

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"
     role="img" aria-labelledby="visual-title visual-desc"
     preserveAspectRatio="xMidYMid meet">
  <title id="visual-title">Short identifying title</title>
  <desc id="visual-desc">Essential takeaway and reading order.</desc>
  <defs><!-- reusable symbols, gradients, clips only when the profile permits --></defs>
  <g id="background">...</g>
  <g id="primary-subject">...</g>
  <g id="relationships">...</g>
  <g id="annotations">...</g>
</svg>
```

Construction rules:

- Always include a `viewBox`; default to `preserveAspectRatio="xMidYMid meet"` for complete illustrations.
- Scope every ID with an illustration-specific prefix when SVGs may be inlined together.
- Reuse repeated geometry with `<symbol>`/`<use>` when supported by the target.
- Use nested `<g>` elements to separate static positioning from animated transforms.
- Prefer native SVG geometry and `<text>`/`<tspan>`; avoid `foreignObject` unless the target explicitly supports it.
- Wrap labels deliberately. Do not rely on SVG to wrap text automatically.
- Draw connectors behind nodes and labels. Route them around objects; make endpoints unambiguous.
- Keep hand-authored source readable until visual approval. For generated assets, the readable generator and source
   data are the editable master; generated markup may be compact. Optimize delivery output only after validation.
- For repeated or mathematical geometry, generate deterministically with fixed inputs and a fixed random seed.

### 7. Validate structure

Run the bundled validator:

```powershell
python scripts/validate_svg.py path/to/illustration.svg --profile docs-inline
python scripts/validate_theme.py path/to/theme.json
```

Profiles: `docs-inline`, `docs-animated`, `web-inline`, `standalone`, `office`, `print`, `icon`.

Fix malformed XML, duplicate IDs, dangling references, unsafe external resources, missing accessible names, and
profile violations before visual review. The validator is a baseline, not proof of quality.

### 8. Render, inspect, and revise

This step is mandatory.

1. Render the SVG in its real destination when possible; otherwise use a browser at the intended dimensions.
2. Capture a PNG preview and inspect it visually.
3. Test the smallest expected display size and at least one large size.
4. For theme-aware work, test light, dark, and print/high-contrast contexts as applicable.
5. For animated work, capture first, proof, overlap/handoff, final-minus-hold, final, and reduced-motion states.
6. Revise and repeat. Allow up to three focused correction rounds before reconsidering the composition.

Inspect for:

- wrong visual hierarchy or unclear first focal point;
- clipped, overflowing, tiny, or ambiguous text;
- accidental overlaps, tangencies, edge crossings, or connectors through objects;
- unbalanced whitespace, crowded regions, and large meaningless voids;
- weak silhouettes, incorrect anatomy/counts, inconsistent perspective, or impossible depth;
- color contrast, color-only encoding, and inaccessible motion;
- cropped strokes, filters, shadows, markers, and symbols at viewBox edges;
- rendering differences in the target profile.

Read [accessibility and validation](./references/accessibility-and-validation.md) for the full review protocol.

### 9. Optimize and deliver

- Remove editor metadata, unused definitions, hidden leftovers, and accidental precision.
- Preserve `viewBox`, accessible naming, meaningful IDs, and editability unless the target forbids them.
- Do not convert text to paths unless exact font portability is required; provide an editable-text variant when useful.
- Deliver the source SVG plus requested exports. Include a short text alternative or long description for complex work.
- Record external asset licenses and sources. Do not trace copyrighted artwork or imitate a living artist's style.

## Quality Gate

Do not finish until every applicable statement is true:

- The medium and production profile are explicit.
- The image has one legible visual thesis and a deliberate reading order.
- Spatial structure mirrors the concept rather than defaulting to equal boxes.
- All content is factual, legible, and complete at delivery size.
- The silhouette/composition works before decorative detail.
- Color, typography, stroke, iconography, and depth are internally consistent.
- Every required color mode and appearance preset preserves content, geometry, hierarchy, and contrast.
- Information is not encoded by color alone.
- The SVG is responsive, self-contained as required, and valid for its target profile.
- Informative SVGs have a short accessible name; complex SVGs also have an adjacent structured description.
- Animation is optional, purposeful, and has a reduced-motion/static fallback.
- Data encodings, transforms, scales, and labels reproduce the source truth without invented precision.
- The actual render has been inspected and corrected; no clipping, overlap, broken references, or blank output remains.

## References

- [Visual routing](./references/visual-routing.md): choose SVG versus diagrams, charts, HTML, Canvas, or 3D.
- [Data visualization](./references/data-visualization.md): find opportunities; choose encodings, scales, transforms, graph layouts, and analytical tables.
- [Composition and layout](./references/composition-and-layout.md): visual arguments, hierarchy, patterns, geometry, and text.
- [Illustration techniques](./references/illustration-techniques.md): organic subjects, objects, environments, perspective, and generative work.
- [Production and embedding](./references/production-and-embedding.md): renderer profiles, responsive SVG, animation, optimization, and export.
- [Theme contract](./references/theme-contract.md): customizable semantic colors, light/dark variants, and visual personalities.
- [Motion and animation](./references/motion-and-animation.md): tasteful deterministic SVG choreography and frame validation.
- [Accessibility and validation](./references/accessibility-and-validation.md): semantics, long descriptions, contrast, motion, and visual QA.
- [Research sources](./references/research-sources.md): reviewed skills, frameworks, standards, and the ideas synthesized from each.