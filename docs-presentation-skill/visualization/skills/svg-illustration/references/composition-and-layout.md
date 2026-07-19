# Composition and Layout

## Begin With a Visual Argument

A useful illustration makes a claim visible. Write the claim as a visual thesis:

> The viewer should immediately see that **A** changes, contains, blocks, feeds, outweighs, or differs from **B**.

Then choose geometry that demonstrates the verb. If the thesis could be removed without changing the layout, the
composition is probably generic.

## Three Reading Distances

Design every substantial illustration at three levels:

1. **Glance:** dominant subject, direction, and conclusion.
2. **Scan:** major groups, stages, comparisons, or spatial regions.
3. **Inspect:** evidence, annotations, values, exceptions, and source detail.

Use scale, enclosure, spacing, and contrast to keep these levels distinct. Do not render all labels at equal weight.

## Map Meaning to Space

| Meaning | Spatial form |
| --- | --- |
| sequence / time | directed path, timeline, or repeated states |
| cycle / feedback | ring, loop, return arrow, or repeated orbit |
| one-to-many | fan-out, branching tree, or radiating field |
| many-to-one | convergence, funnel, braid, or aggregation basin |
| hierarchy | nested enclosure, levels, tree, or stepped scale |
| containment | bounded region with clear ownership and padding |
| transformation | before/after, input-machine-output, or morph sequence |
| comparison | shared baseline, aligned columns, mirror, overlay, or small multiples |
| tension / conflict | opposing direction, collision, imbalance, or blocked path |
| dependency | directed connectors, stack, or support structure |
| affinity | proximity, shared enclosure, color family, or repeated motif |
| uncertainty | ranges, fading edges, alternatives, explicit labels, or probability bands |
| central influence | radial hierarchy with controlled spokes |
| spatial reality | scene, map, cutaway, section, plan, or axonometric projection |

## Composition Patterns

### Focal field

One dominant subject with annotations or supporting evidence around it. Use for mechanisms, products, anatomy,
objects, and editorial explainers. Keep labels outside the silhouette when possible and connect with short leaders.

### Directed path

A clear start-to-finish route. Use a consistent direction and reserve reversals for actual loops. Alternate vertical
positions only when it improves label space; decorative zigzags weaken sequence.

### Layered system

Horizontal or vertical strata representing abstraction, depth, ownership, or processing. Align interfaces between
layers and show only cross-layer connections that matter.

### Branch and convergence

Use branch angles and spacing to communicate alternatives or distribution. Use convergence to communicate
aggregation or synthesis. Avoid crossing branches; if crossings are meaningful, distinguish bridges from junctions.

### Radial system

Use only when centrality, cycles, orbit, or equal relation to a core is real. Radial layouts make label placement
hard; reserve outer arcs or use numbered labels plus a keyed legend.

### Comparison

Share a baseline and visual grammar. Keep comparable features aligned. Differences should carry the visual emphasis;
identical decoration should not compete.

### Scene or cutaway

Use for spatial mechanisms and real-world contexts. Establish horizon/perspective, foreground-midground-background,
then use annotations without flattening the scene into a diagram grid.

### Multi-panel narrative

Use small multiples when change across states matters more than simultaneous overview. Lock scale, camera, and
alignment unless the change itself is camera or scale.

## Layout Procedure

1. Select the final aspect ratio and safe margin.
2. Reserve title/caption space only if the title belongs inside the artifact.
3. Place the dominant subject or main flow spine.
4. Divide remaining space into semantic zones.
5. Estimate label widths before fixing node sizes.
6. Place primary relationships and route connectors.
7. Add evidence and annotation.
8. Inspect negative space and rebalance.
9. Add restrained decoration last.

## Geometry and Spacing

Choose a base spacing unit `u` appropriate to the viewBox, commonly 8, 10, 12, or 16 units.

- micro gap: `0.5u`
- related gap: `u`
- component padding: `1.5u–2u`
- group gap: `3u–4u`
- major-zone gap: `5u–8u`
- safe outer margin: at least `3u`, more for labels, shadows, or wide strokes

Use formulas for repeated structures rather than hand-estimated coordinates:

```text
availableWidth = viewBoxWidth - leftMargin - rightMargin
cellWidth = (availableWidth - gap * (columns - 1)) / columns
x(column) = leftMargin + column * (cellWidth + gap)
```

For a radial layout with `n` items:

```text
angle(i) = startAngle + i * 2π / n
x(i) = centerX + radius * cos(angle(i))
y(i) = centerY + radius * sin(angle(i))
```

Round final authored coordinates sensibly. Preserve higher precision only for generated curves where visible quality
requires it.

## Hierarchy

Build hierarchy in this order:

1. position and spatial ownership;
2. scale and area;
3. whitespace;
4. value contrast;
5. typography;
6. color and detail.

Color cannot repair a layout where everything has the same size and spacing.

## Typography

- Use no more than three type roles in most illustrations: title, label, annotation.
- Prefer sentence case and concise labels.
- Keep essential text as `<text>` rather than paths.
- SVG does not wrap text automatically. Measure and split labels into `<tspan x="..." dy="...">` lines.
- Increase line count or container width instead of shrinking below the delivery-size legibility threshold.
- Test long words, numbers, and CJK text; character count is not a reliable universal width measure.
- Set `text-anchor` and baseline intentionally; browser baseline behavior should be verified in the target renderer.
- Avoid vertical or curved body text. Use it only for short labels where the reading cost is justified.

## Connectors

- Draw connectors before nodes so endpoints tuck beneath shapes.
- Connect boundary-to-boundary, not center-to-center through filled objects.
- Prefer direct or orthogonal routes. Use curves when they encode flow or reduce crossings.
- Keep arrowheads proportional to stroke width and visible at final size.
- Use line style semantically: solid for primary/current, dashed for optional/projected, dotted for indirect/ambient.
- Label relationships near the middle of a clear segment, with a background knockout if necessary.
- Do not let lines pass behind text unless the occlusion is deliberate and readable.
- When many edges cross, change the layout or use a graph engine; styling is not a cure for topology.

## Color

Define roles before hex values:

- canvas / surface;
- primary ink / secondary ink;
- structural line;
- primary accent;
- secondary accent;
- success / warning / danger only when those meanings exist;
- muted region / inactive state.

Use a restrained palette. A practical default is neutral canvas and ink, one dominant accent, one supporting accent,
and semantic state colors when needed. Test contrast in every target theme. Pair color with labels or form.

## Depth and Layering

Use overlap, scale, value, and occlusion consistently. Pick one depth model:

- flat diagrammatic;
- shallow layered paper;
- axonometric;
- perspective scene.

Do not combine conflicting projections casually. Shadows should reveal hierarchy or elevation, not decorate every
shape. In technical work, explicit boundaries are usually clearer than large blurred shadows.

## Density and Multi-Zoom

For dense visuals:

- summarize the whole with one dominant path or structure;
- use visible region boundaries and section labels;
- provide one or two concrete evidence artifacts per important region;
- remove duplicated prose;
- split into panels or companion figures when labels fall below readable size.

The goal is not maximal occupancy. Empty space is useful when it separates meaning; it is waste when it interrupts
the reading path without purpose.

## Anti-patterns

- Equal rounded cards for unrelated concepts.
- A decorative central circle with arbitrary spokes.
- Arrows that indicate no defined relationship.
- Every section using a different color without semantics.
- Long paragraphs embedded inside SVG.
- Tiny labels used to preserve an overfull composition.
- Icons as substitutes for unfamiliar concepts without labels.
- Repeating the same fact as title, label, annotation, and legend.
- Gradients, glow, or shadows used to manufacture hierarchy absent from the layout.