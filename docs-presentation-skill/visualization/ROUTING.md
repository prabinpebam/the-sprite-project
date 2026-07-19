# Visualization Ownership

## Decision

Use a **hybrid knowledge model with a single final-render owner**:

- AntV specialists contribute chart semantics, transforms, scale selection, graph algorithms, and interactive
  implementation knowledge.
- `svg-illustration` owns every custom static documentation asset, including composition, geometry, accessibility,
  renderer compatibility, and render-inspect-fix QA.
- `svg-theme-system` owns semantic color modes and appearance parameters shared across those assets.

Do not patch an unreliable generated SVG path-by-path. Preserve the source data and intended encoding, then rebuild
the static asset through the SVG skill's deterministic geometry and validation workflow.

## Ownership Table

| Need | Specialist knowledge | Final owner |
| --- | --- | --- |
| Static chart or annotated data figure | Consult G2 selection/scale/transform references for nontrivial statistics | `svg-illustration` |
| Static process, architecture, hierarchy, map, infographic, or editorial visual | None required unless a graph algorithm is genuinely needed | `svg-illustration` |
| Interactive statistical chart | G2 | G2 runtime, tested in-browser |
| Dense or interactive network | G6 | G6 runtime; static publication derivative goes through `svg-illustration` |
| Pivot/cross-analysis table | S2 | S2 runtime or semantic HTML table |
| Interactive node editor | X6 | X6 runtime |
| Quick API-generated chart/infographic/narrative prototype | chart-visualization / infographic / T8 | Prototype only; not a default shippable docs asset |

## Static Handoff

1. Model and verify the source data.
2. When needed, consult exactly one specialist for encoding, scale, transform, or layout reasoning.
3. Record the semantic result: data, categories, scale type/domain, hierarchy, relationships, and annotations.
4. Author or generate the final SVG with `svg-illustration`; do not inherit opaque layout coordinates blindly.
5. Run structural/profile validation.
6. Render in the real docs context, inspect at target sizes, repair, and repeat.
7. Keep the data source or deterministic generator beside the SVG when maintainability matters.

## Anti-bloat Rule

- Chart theory remains in G2 references.
- Graph algorithms remain in G6 references.
- Table behavior remains in S2.
- Editor behavior remains in X6.
- Composition, SVG production, accessibility, and visual QA live only in `svg-illustration`.
- Color-mode and visual-personality contracts live only in `svg-theme-system`.
- This routing file owns the handoff policy; individual skills should link here instead of restating it.

## Rationale

Removing it would discard deep, useful knowledge for statistical transforms, chart semantics, dense graph layouts,
pivot analysis, and interactive editors. Those are real domains that a general illustration skill should not
duplicate.

At the same time, post-processing opaque generated geometry is brittle: a rerender can invalidate manual fixes,
labels and edges may
not expose stable semantic anchors, and accessibility can remain detached from the source data. Reconstructing a
static figure from the semantic model gives the SVG layer stable ownership and reproducible validation.