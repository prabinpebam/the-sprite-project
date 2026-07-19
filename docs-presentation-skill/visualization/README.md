# Visualization Skills

Static documentation visuals are SVG-first. Read [`ROUTING.md`](ROUTING.md) for the ownership
boundary: `svg-illustration` owns final static assets and visual QA; AntV skills remain available
for specialist chart, graph, table, and editor knowledge or genuinely interactive deliverables.

The AntV directories below are an English translation of
[`antvis/chart-visualization-skills`](https://github.com/antvis/chart-visualization-skills).

An **English translation** of the `skills/` from
[antvis/chart-visualization-skills](https://github.com/antvis/chart-visualization-skills)
(originally authored primarily in Chinese).

The translated content is retained so its specialist knowledge can be consulted without making
AntV-generated artwork the default static output.

## Attribution & License

- **Original work:** [antvis/chart-visualization-skills](https://github.com/antvis/chart-visualization-skills)
- **Original copyright:** © 2025 AntV Visualization Team
- **License:** MIT (unchanged) - see [`LICENSE`](./LICENSE) and [`NOTICE`](./NOTICE)

This is a derivative work distributed under the same MIT License. The original copyright
notice and permission notice are retained in `LICENSE`, as the license requires.

## Skills

| Skill | Description |
|-------|-------------|
| [`antv-g2-chart`](./skills/antv-g2-chart) | Statistical charts with AntV **G2** (marks, scales, transforms, interactions, compositions…) |
| [`antv-g6-graph`](./skills/antv-g6-graph) | Graph / network visualization with AntV **G6** (elements, layouts, behaviors, plugins) |
| [`antv-s2-expert`](./skills/antv-s2-expert) | Pivot tables & spreadsheets with AntV **S2** |
| [`antv-x6-editor`](./skills/antv-x6-editor) | Node/edge diagram editor with AntV **X6** |
| [`chart-visualization`](./skills/chart-visualization) | Generate chart images via the AntV GPT-Vis API |
| [`icon-retrieval`](./skills/icon-retrieval) | Icon retrieval helper |
| [`infographic-creator`](./skills/infographic-creator) | Infographic creation |
| [`narrative-text-visualization`](./skills/narrative-text-visualization) | Narrative-text visualization |
| [`svg-illustration`](./skills/svg-illustration) | **Default static owner:** accessible charts, illustrations, diagrams, subjects, scenes, maps, and generative vector work |
| [`svg-theme-system`](./skills/svg-theme-system) | Semantic color themes, light/dark variants, brand customization, and casual/formal/sharp/simple/friendly appearance presets |

## Layout

```
skills/
  <skill-name>/
    SKILL.md          # entry point (frontmatter: name, description)
    references/       # supporting reference docs (larger skills)
```

## Notes

- Skill and directory **names** are kept identical to the source (they are identifiers).
- If you spot a translation that reads awkwardly for a technical term, prefer the original
  AntV terminology; the goal is clarity, not literalness.
