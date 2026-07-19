# Product, UX, and Developer Experience Review

## Product Truth

Review the causal chain:

```text
user + context -> problem -> current cost -> promised outcome -> behavior -> evidence
```

Reject chains that jump from a vague problem directly to a feature list. Verify:

- named primary user and relevant secondary actors
- current behavior from repository or real product evidence
- desired observable outcome and why it matters now
- consequence of doing nothing
- promise, non-promises, constraints, and success evidence
- north-star relationship without forcing long-term scope into the current stage

## Premise and Alternatives

For material work, compare at least:

1. minimum viable approach
2. recommended balanced approach
3. long-term or ideal architecture when meaningfully different

For each, state outcome coverage, existing-system reuse, effort, risk, reversibility, operational burden, migration cost, and future constraint. If only one viable approach remains, name the eliminated alternatives and why.

Do not confuse completeness with maximal scope. Complete the accepted promise, including its failure and evidence paths; do not add unrelated promises because implementation is cheap.

## User Journey and Information Architecture

Trace the complete task rather than a collection of screens:

```text
entry -> orientation -> action -> feedback -> correction/recovery -> completion -> return use
```

For each step specify:

- user goal and entry condition
- information visible first, second, and third
- available action and accessible name
- immediate system status
- cancel, back, undo, and retry behavior
- persisted or exported result
- next likely action

Apply the core usability heuristics as review prompts: visible system status; user language; control and freedom; consistency; error prevention; recognition over recall; novice and expert efficiency; focused design; actionable recovery; contextual help.

## Interaction State Matrix

Every user-visible feature needs applicable states:

| State | Specify |
|---|---|
| initial/first use | orientation, defaults, first action |
| loading/in progress | status, continued actions, cancellation, timeout |
| empty | why empty, meaningful next action, not a dead end |
| success | exact result, persistence, next action |
| partial | what completed, what did not, safe retry behavior |
| invalid | field/item, cause, correction, preserved input |
| error | problem, consequence, recovery, retained state |
| stale/conflict | what changed, comparison, resolution choices |
| offline/unavailable | available local behavior and blocked behavior |
| destructive confirmation | object identity, consequence, cancel/default focus |

## Accessibility Contract

For web or desktop UI, make the acceptance level explicit, normally WCAG 2.2 AA where applicable. At minimum specify:

- semantic names, roles, values, relationships, and status announcements
- keyboard reachability, conventional composite-widget keys, logical focus order, visible focus, and focus restoration
- no keyboard trap and no focus hidden by authored overlays
- distinction between focus and selection
- labels that remain visible, textual error identification, and correction suggestions
- contrast, non-color cues, zoom/reflow, text spacing, and non-text contrast
- pointer alternatives for drag/path gestures and minimum target sizing
- reduced-motion behavior and no unsafe flashing
- screen-reader reading order aligned with DOM and keyboard order

Do not accept "accessible" as an oracle. Name interactions and tests.

## Visual and Content Direction

Review design intent, not only component inventory:

- subject, audience, and the screen's single job are explicit
- visual hierarchy and one memorable, domain-specific signature are clear
- typography, palette, spacing, density, and motion derive from product context or the existing design system
- structure encodes information rather than decorating it
- repeated cards, decorative icons, generic hero copy, and arbitrary gradients are challenged
- copy names user concepts and commands consistently, uses active voice, and explains failures without internal jargon
- responsive behavior is intentionally recomposed, not merely stacked

For established products, existing design-system decisions outrank generic aesthetic advice.

## Developer Experience

Apply only to developer-facing surfaces. Trace:

```text
discover -> evaluate -> install -> first value -> real integration -> debug -> upgrade -> migrate/leave
```

Specify the primary developer persona, expected environment, tolerance, and time-to-first-value target. Review:

- one obvious start path and production-relevant example
- defaults that produce a safe useful result with explicit escape hatches
- guessable, consistent API/CLI vocabulary
- errors that state problem, cause, fix, and reference where useful
- runnable examples in real context, not toy snippets that omit auth/errors/deployment
- types, editor support, testability, dry-run/verbose modes, CI/noninteractive use
- versioning, deprecation, compatibility, migration, and rollback guidance
- supported platforms and a real distribution path

Do not force community, hosted playground, telemetry, or pricing requirements onto an internal or local tool unless its product model requires them.