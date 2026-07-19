# MVP Customer Promise

**Stage:** Character-to-Godot MVP

**Target user:** Solo and small-team game developers without a dedicated pixel artist who accept the LPC visual language

**Objective completion gate:** Every in-scope task flow and expected behavior passes through visible interaction in the production UI with no unresolved severity 0-2 anomaly

## CP-QUICK-START - A developer can begin with a useful animated character instead of an empty art canvas.

- **User:** A developer without production-ready character art
- **Context:** Starting a local game project or prototype
- **Trigger:** They need a coherent playable character quickly
- **Observable outcome:** A named local project contains a composed humanoid character using a curated pack and sensible defaults
- **Quality expectation:** The first useful preview requires no asset-format, frame-layout, or licensing knowledge
- **Recovery expectation:** The user can cancel creation, replace choices, or return to a valid starter composition
- **Acceptance evidence:** TF-FIRST-PROJECT and TF-COMPOSE pass in the actual UI
- **Status:** verified

## CP-CREATIVE-CONTROL - A developer can make the character fit their game while remaining visually coherent.

- **User:** A developer adapting a starter character
- **Context:** Composing appearance and evaluating motion
- **Trigger:** The default character does not match the intended role or palette
- **Observable outcome:** The user selects compatible layers, applies semantic colors, overrides one character, and previews idle and walk in four directions
- **Quality expectation:** Every action updates a crisp pixel preview immediately and exposes coverage or compatibility problems before export
- **Recovery expectation:** Selections and overrides can be replaced, cleared, or reset without rebuilding the project
- **Acceptance evidence:** TF-COMPOSE, TF-EDIT-COMPOSITION, TF-THEME, and TF-PREVIEW pass
- **Status:** verified

## CP-REPRODUCIBLE-WORK - A developer can leave and return without losing the recipe or receiving a different character.

- **User:** A returning developer
- **Context:** Continuing work in the same browser on the same device
- **Trigger:** The page is reloaded or the project is reopened
- **Observable outcome:** Project name, pack, layer recipe, theme, overrides, preview settings, and deterministic render are restored
- **Quality expectation:** The same project data and pack version produce the same rendered image and export hashes
- **Recovery expectation:** Invalid or obsolete saved data is rejected with a clear recovery path and never silently corrupts a valid project
- **Acceptance evidence:** TF-SAVE-REOPEN and TF-RECOVER pass
- **Status:** verified

## CP-GAME-READY-DELIVERY - A developer can take the character into a game without manually slicing frames or reverse-engineering animation metadata.

- **User:** A Godot 4 developer or a developer using generic sprite tooling
- **Context:** The character is ready to integrate
- **Trigger:** The user opens Export
- **Observable outcome:** The product downloads either a generic package or a Godot 4 package containing a spritesheet, animation data, build manifest, and credits
- **Quality expectation:** Names, frame regions, direction cycles, speeds, dimensions, and hashes are explicit and machine-consumable
- **Recovery expectation:** Export is blocked with actionable readiness messages when required content is absent
- **Acceptance evidence:** TF-EXPORT-GENERIC and TF-EXPORT-GODOT pass, and the Godot fixture consumes the package
- **Status:** verified

## CP-LEGAL-CONFIDENCE - A developer can understand and carry forward the provenance and attribution attached to the chosen art.

- **User:** A developer responsible for shipping legally usable assets
- **Context:** Selecting source art and exporting a character
- **Trigger:** The user inspects an asset, credits, or an export package
- **Observable outcome:** Every selected layer traces to pack, source, author, license, and chosen license path; exact merged credits ship with every export
- **Quality expectation:** Unknown or disallowed provenance fails closed rather than producing incomplete attribution
- **Recovery expectation:** The user can replace an affected layer with an eligible option
- **Acceptance evidence:** TF-INSPECT-CREDITS and export flows pass
- **Status:** verified

## Promise Boundary

Anything plausible for the target user but not required by these five promises appears in [scope-ledger.md](scope-ledger.md). Absence from both the traceability model and exclusion ledger is a scope defect.
