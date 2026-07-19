# Motion and Animation

Motion is optional. Add it only when time clarifies sequence, causality, state, direction, hierarchy, or attention. The static first/final state must remain complete and useful.

This reference adapts production motion principles to SVG and HTML. It does not require HyperFrames, GSAP, or a video runtime. HyperFrames is a research source for deterministic choreography, atomic rules, staged reveals, seekable states, and frame diagnostics; implementation here stays SVG-native.

## Motion Brief

Before code, write:

```text
Purpose:
Animated subject:
Start state:
Proof state(s):
Final state and hold:
Duration:
Trigger: load | user action | host timeline
Runtime: CSS | WAAPI | SMIL | host timeline
Reduced-motion state:
```

If the purpose is only “make it feel alive,” keep it static.

## Choreography Model

Compose two to four atomic moves, not a bag of effects:

1. establish or enter;
2. reveal, trace, or change in meaningful order;
3. emphasize the proof moment;
4. settle and hold.

For complex motion, plan time-coded phases before markup. Do not dump every element at time zero. Preserve subject identity through transformation; a substitute crossfade does not prove that the same object moved or changed.

## Choose the Animation Role

Every animation must have exactly one primary role. Roles may be sequenced, but do not stack effects on the same
element merely because they are available.

### Entry animation

Use entry motion when it establishes reading order, hierarchy, assembly, or causality.

- reveal parent structure before children;
- reveal connectors before or with the destination they explain;
- grow measured bars from the true baseline;
- stagger ordered steps, ranked rows, or timeline milestones in semantic order;
- use short distance/scale changes so elements settle exactly into authored geometry;
- finish quickly enough that the complete figure is readable without waiting.

Do not animate every label independently. Group labels with the mark or node they describe unless separate timing
adds meaning.

### Highlight animation

Use highlight motion when the viewer should notice an active state, selected item, conclusion, outlier, current
phase, or resolved result.

- prefer one or two pulses of stroke, halo, opacity, or modest scale after entry;
- highlight the claim, not decoration;
- preserve encoded values and geometry (a data bar must not overshoot its value);
- pair color with a non-color cue when color already encodes another variable;
- stop after the emphasis unless the state is genuinely ongoing.

### Loop animation

Use a loop only when the subject represents an ongoing process: live synchronization, orbit/cycle, active status,
flowing data, moving light, or continuous preview.

- keep amplitude low and duration calm;
- loop one focal mechanism, never the whole figure;
- avoid loops behind dense text or data labels;
- disable loops under reduced motion;
- prefer a finite highlight when “ongoing” is not part of the meaning.

### Functional and aesthetic gate

Motion is functional when removing it loses sequence, state, direction, causality, or attention. It is aesthetic when
it improves continuity, rhythm, and polish without obscuring meaning. Ship only motion that is functional, or clearly
aesthetic and sufficiently restrained.

Reject motion when it delays access to information, changes a measured value or apparent hierarchy, causes
collisions/clipping/reflow, competes with the thesis, repeats without semantic justification, or lacks a complete
static/reduced-motion state.

## Small Motion Vocabulary

| Intent | Mechanism |
| --- | --- |
| reveal one element | opacity + short transform |
| reveal ordered peers | indexed stagger |
| show a route | motion path or sampled x/y |
| grow a line | stroke dash offset |
| transform identity | compatible path morph or shared-element/FLIP |
| expose content | clip/mask reveal |
| show state | explicit finite state keyframes |
| move viewpoint | viewBox or camera-wrapper transform |
| update quantity | count/scale/bar growth from stable baseline |
| hand off attention | anchored fade/translate |

Use one signature move per illustration. Supporting moves reinforce it.

## Timing and Easing

- Delay the first entrance roughly 100–250 ms so load does not read as a jump cut.
- Secondary reveals commonly take 250–450 ms; hero/state changes 450–800 ms.
- Use 50–120 ms ordered offsets for small repeated sets; cap total cascade time.
- Entrances decelerate; exits accelerate; continuous camera/path motion uses in-out or linear only when constant speed is meaningful.
- Critically damped/smooth settling is the default. Bounce and overshoot are rare, explicitly playful or tactile choices.
- Final holds are longer than transition poses so viewers can read the result.
- Stillness is part of choreography. Do not add idle wobble everywhere.
- Documentation figures should usually finish entry and finite highlight motion within 1.5–2.5 seconds. Longer
  sequences require user control or a clearly narrative subject.

## Animate Stable Channels

Prefer transforms, opacity, stroke-dash values, fill/stroke/color, CSS variables, clip/mask/path values when supported, and camera-wrapper transforms.

Avoid layout properties such as width, height, top, left, margin, or padding when transforms express the same move. Do not tween `display`. Keep static position on an outer group and animated transform on an inner group.

## Runtime Choice

### CSS keyframes

Use for one-element entrances, finite decorative motifs, simple stagger, and path-dash reveals. Keep iterations finite and use `animation-fill-mode: both`.

```css
.item {
  opacity: 0;
  transform: translateY(12px);
  animation: reveal 420ms cubic-bezier(.2,.7,.2,1) both;
  animation-delay: calc(120ms + var(--i) * 70ms);
}
@keyframes reveal {
  to { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  .item { animation: none; opacity: 1; transform: none; }
}
```

### Web Animations API

Use for generated keyframes, explicit pause/currentTime control, or a small data-driven timeline without a library. Build synchronously, pause when host-seeking, use finite iterations, and set `fill: "both"`.

### SMIL

Use only when standalone SVG compatibility is known and SVG attribute animation is substantially simpler. Good for path/motion attributes and script-free event sequences. Provide a static fallback; Office, sanitized docs, and many image hosts do not support it reliably.

### Host timeline / GSAP

Use for coordinated multi-phase choreography, shared elements, or deterministic seeking across many subjects. Keep one paused timeline as source of truth, explicit start states, finite motion, and one clock. This is a host integration, not a requirement of the SVG pipeline.

## SVG Patterns

### Stroke draw

Measure path length in the DOM, set `stroke-dasharray` and initial `stroke-dashoffset` to at least that length, then animate offset to zero. Use `fill="none"` during outline drawing. Slightly overlap successive segment starts to read as one continuous trace. Pen-like strokes do not bounce at endpoints.

### Motion path

Orient along the tangent only when direction matters. Keep labels upright. Validate bends and endpoints at sampled frames.

### Shape morph

Native interpolation needs compatible path structures and winding. Add explicit middle poses when a form would collapse or self-intersect. Split complex silhouettes instead of forcing one unreadable morph.

### Shared element

Animate one identity between measured source/final boxes. Preserve a continuous visual anchor; do not fake the transformation with duplicate crossfades.

### Data reveal

Keep axes, scales, and baselines stable. Animate marks from meaningful baselines and reveal labels after settling. Never overshoot a represented value with a spring.

## Determinism

- One explicit clock; no competing timelines on the same property.
- No `Math.random()`, `Date.now()`, wall-clock timers, or unbounded loops in render-critical motion.
- Seed/precompute variation from stable indices.
- Every state is reachable by setting progress/time directly.
- Initial state exists before first paint; final state is exact and held.
- Avoid overlapping tweens writing the same transform/property unless deliberately composed and inspected.

## Reduced Motion

Reduced motion preserves content and state while removing travel, zoom, parallax, spinning, and rapid cascades. Replace them with immediate state, short opacity, or discrete steps. Comprehension must never depend on catching a transient frame.

For external SVG through `<img>`, internal media queries follow the operating system, not necessarily an application toggle. Generate or host a static/reduced variant when the application owns motion preference.

## Taste Guardrails

- Motion serves the message: no ambient blobs, particles, glow, flares, or breathing by default.
- Variation follows roles; random direction/timing is not sophistication.
- Do not use the same entrance, speed, ease, or stagger everywhere.
- Avoid bounce/elastic motion for formal, documentary, statistical, or technical content.
- Reveal groups when independent label motion would damage reading order.
- Avoid continuous motion behind dense text.
- Preserve theme and semantic color meaning through every state.
- Use high-energy transitions only for genuine idea changes.
- A figure may combine entry, one highlight, and one justified loop, but most should use fewer.

## Validation

Inspect more than endpoints. Capture:

1. exact first frame;
2. early entrance;
3. each mechanism’s peak-proof pose;
4. overlap/handoff moments;
5. final-minus-hold;
6. exact final frame;
7. reduced-motion state.

Sample bounding boxes through time and flag clipping, collisions, dead zones, inconsistent stagger/direction, identity breaks, unreadable text, wrong final state, missing hold, or motion still running.

Record the chosen roles for each SVG:

```text
Entry: none | grouped fade/settle | stagger | grow | draw
Highlight: none | pulse | halo | contrast | focus
Loop: none | flow | active-status | orbit/cycle | light/preview
Why each role matches the subject:
```

## Profile Limits

- `docs-inline`, Office, print, and static publication: static only.
- `docs-animated`: self-contained external SVG with CSS animation, no script/SMIL/external resources, and mandatory reduced-motion rules.
- `web-inline`: CSS/WAAPI or host timeline, scoped selectors, reduced motion.
- `standalone`: self-contained CSS/SMIL when supported; finite motion and static fallback.
- interactive app: host owns triggers, focus, pause/replay, and application-level reduced motion.

## Research Basis

Synthesized in original wording from HyperFrames’ Apache-2.0 animation/keyframe skills and motion doctrine, plus MDN CSS, WAAPI, and SVG guidance. No HyperFrames runtime or source code is vendored.
