# UPD-002 Product and Experience Design Specification

This document is binding for the user experience of the Local Content Pack Ecosystem. The traceability model owns IDs and objective behavior; this document owns hierarchy, layout, interactions, content, responsive behavior, accessibility, and state presentation.

## 1. Experience Principles

1. **Inspect before trust.** Untrusted pack bytes never appear as installed content until validation finishes and the user reviews a human-readable summary.
2. **Projects never drift silently.** Pack enablement affects new selection only. Version changes and replacements name affected projects, preview changes, and require explicit confirmation.
3. **Author through the runtime.** The authoring preview uses the same decoder, color binding, renderer, credits, and export path as installed packs; no mock preview is accepted.
4. **Legal metadata is part of the asset.** Source and license fields sit beside visual configuration, not in a detached final form.
5. **Progressive disclosure follows task size.** Installation and destructive confirmation use dialogs. Pack detail and authoring use full work views because they contain substantial secondary workflows.
6. **Local custody remains visible.** Every pack surface states origin, local availability, storage impact, and whether content is bundled, installed, embedded, authored, disabled, missing, or in use.
7. **Errors preserve work.** Validation and repository failures retain chosen files, draft input, original bytes, focus context, and last valid installed content.

## 2. Global Information Architecture

### Navigation

Add `Packs` to the primary workflow navigation after `Storage` and before `Export`. In Electron, it appears in the same project workflow below the custom titlebar. In web it appears in the existing horizontal/mobile navigation.

`Packs` opens `VIEW-PACK-LIBRARY`. `Create pack` enters `VIEW-PACK-AUTHOR` with a breadcrumb `Packs / Draft name`. Asset configuration is a nested view `Packs / Draft name / Asset name`. Validation is `Packs / Draft name / Validate & export`.

The current character workspace retains its `Content pack` selector. Installed enabled versions appear after bundled packs, grouped by pack name and version. Disabled packs do not appear for new selection. A locked disabled pack remains visible and selected in an existing project.

### Persistent chrome

- Top command bar retains New project and Save.
- In authoring, the command bar additionally shows draft state: `Unsaved`, `Saving`, `Saved revision N`, or a stable failure code.
- Switching between project and pack authoring never conflates project dirty state with draft dirty state.
- Browser/Electron host identity and data-location language remain unchanged.

## 3. View Contracts

## 3.1 Pack Library (`VIEW-PACK-LIBRARY`)

### Purpose

Browse and manage all local pack versions and enter installation or authoring.

### Desktop layout

- Header: `Packs`, short local-custody subtitle, `Add pack`, and `Create pack` commands.
- Compact status band: total installed bytes, bundled count, local version count, authored draft count, and offline readiness.
- Filter row: search by name/ID/author, origin filter (`All`, `Bundled`, `Installed`, `Authored`, `Embedded`, `Missing`), status filter (`Enabled`, `Disabled`, `In use`, `Has issue`), deterministic sort (`Name`, `Recently installed`, `Storage`).
- Main list: table/list rows, not decorative cards. Each row shows name, ID, version, checksum prefix, origin, enabled state, availability, storage, asset count, coverage summary, and dependent-project count.
- Selecting a row opens Pack Detail in the same content pane and preserves filter state on Back.

### Empty states

- Bundled-only: explain that local packs are files the user owns; show Add pack and Create pack.
- No search results: preserve filters and provide Clear filters.
- Repository unavailable: show stable code, Retry, Export diagnostics, and retain current project access.

### Responsive

Below 820px, filters collapse behind a `Filters` button with active count. Rows become two-line list items with status and storage; actions remain in an overflow menu. No horizontal page scrolling at 200% zoom.

## 3.2 Pack Install Review (`VIEW-PACK-INSTALL`)

Installation is a modal because it is a bounded inspection/confirmation task.

### Validation states

1. `Reading package` — filename and byte size visible; cancel remains available.
2. `Validating container`, `Validating images`, `Validating pack graph`, `Validating provenance`, `Checking local versions` — one status region announces stages without focus theft.
3. `Ready to install` — Install enabled.
4. `Already installed` — primary action becomes Done; identical install is idempotent.
5. `Conflict` — Install disabled; identity/checksum conflict explained.
6. `Rejected` — stable code, stage, exact field/entry, observed and allowed value, choose another file, download report, cancel.

### Ready summary

Show:

- pack name, canonical ID, SemVer, full checksum copy command
- `humanoid-lpc-64` profile
- asset count and slots
- idle/walk four-direction coverage
- token-bound and fixed-color counts
- authors, sources, offered/chosen licenses, attribution requirement
- compressed/expanded bytes and local storage estimate
- duplicate/version state
- warnings separated from blockers
- explicit text: `Packs are untrusted local data. This pack contains no executable code.`

No install choice is preselected when a conflict requires a choice. Escape cancels. Closing returns focus to Add pack.

## 3.3 Pack Version Detail (`VIEW-PACK-DETAIL`)

### Header

Name and version, origin badge, availability status, checksum, `Enable for new selections` switch, and action menu.

### Sections

- Overview: ID, profile, description, install time, source package name, storage.
- Assets: grouped by slot; name, ID, dimensions, checksum, coverage, token/fixed-color counts, validation state.
- Versions: all installed versions with current project locks and compatibility difference summary.
- Projects: exact dependent project names/IDs and current snapshots/backups.
- Sources & licenses: per-asset source, author, offered/chosen license, attribution preview.
- Diagnostics: package and repository validation status plus exportable report.

### Lifecycle actions

- Enable/disable is a switch with immediate status announcement. Disabling does not prompt because it affects only future selection.
- `Use version in project` opens a substantial compatibility subview. It compares assets, selected IDs, render hash, and credits before confirmation.
- `Remove pack version` opens confirmation only when removable. In-use/bundled/embedded-only/test-copy states show why removal is unavailable and link to dependencies.

## 3.4 Missing Pack Recovery (`VIEW-PACK-RECOVERY`)

This replaces the normal preview/export region while retaining the project name and read-only recipe summary.

Show exact pack ID, version, checksum, original project/source host, and affected capabilities. Preview and exports are disabled; project data remains inspectable.

Actions:

1. `Locate exact pack` — local chooser; accepts only exact identity/checksum.
2. `Replace in a copy` — opens compatibility selection; creates new project only after preview and confirmation.
3. `Export project backup` — always available.
4. `Cancel` — returns to blocked project without mutation.

Never offer silent nearest-version replacement.

## 3.5 Pack Authoring Workspace (`VIEW-PACK-AUTHOR`)

### Audience and onboarding

The workflow targets technical artists familiar with layer sheets but not JSON. It does not teach pixel art. First use shows a short compatibility checklist: PNG, current 256×512 layout, transparent background, owned/redistributable art, and supported licenses.

### Layout

- Left rail: numbered sections `Identity`, `Assets`, `Validate & export`; each shows complete, warning, or blocked state.
- Main pane: active form or asset list.
- Right preview pane on wide screens: runtime preview, animation/direction controls, current theme, pixel hash, coverage, and generated credits. On constrained widths it moves above the form and remains collapsible.
- Header: draft name, revision, save status, overflow menu (`Rename draft`, `Duplicate draft`, `Download recovery`, `Delete draft`).

### Identity section

Fields:

- Pack name
- Canonical pack ID with pattern and permanence warning
- SemVer version
- Description
- Subject profile, fixed/read-only `Humanoid LPC 64`
- Pack-level author and optional homepage (defaults for new assets, not a substitute for per-asset source)

Canonical ID changes are allowed only before first exported/self-installed version. Afterwards `Create new pack identity` duplicates the draft.

### Assets section

List rows show thumbnail, name, canonical asset ID, slot, coverage, validation blockers, and source. Commands: Add layer sheet, configure, duplicate metadata, replace source PNG, remove.

Removing an asset with completed configuration requires confirmation and retains source bytes in draft recovery until the next successful export or 30 days.

## 3.6 Asset Configuration (`VIEW-PACK-ASSET`)

### Step A: Source

Show filename, 256×512 dimensions, RGBA mode, byte size, SHA-256, distinct RGB count, and transparent-pixel ratio. Replace source requires revalidation but preserves identity/provenance fields. Invalid source remains attached to the draft as an offending asset until removed or replaced.

### Step B: Runtime identity

- Canonical asset ID, unique in pack
- Display name
- Slot: body, hair, headwear, torso, legs, feet
- Description
- Coverage: fixed display of idle and walk, south/west/east/north; validation visualizes empty frames
- Default selection eligibility toggle; only one default per required slot

### Step C: Source color bindings

A dense table lists every distinct non-transparent RGB color sorted by descending pixel count, then hexadecimal value. Alpha is preserved and not a mapping key.

Each row shows swatch, `#rrggbb`, pixel count, sample locations, and one required disposition:

- `Fixed color` — source RGB remains unchanged.
- `Semantic token` — choose one current token and shade −2..2. Runtime replaces RGB with resolved token shade and preserves source alpha.

Batch actions apply only after a preview and confirmation. No inferred mapping is silently committed. Unmapped colors block validation. More than 256 colors or partially transparent edge colors are allowed within limits but produce review warnings.

### Step D: Source and license

Required per asset:

- author
- source title
- HTTPS source URL
- offered licenses from curated vocabulary
- chosen license, constrained to offered licenses
- attribution text when profile requires it
- confirmation: `I have the right to package and redistribute this source under the chosen terms.`

The UI states: `The Sprite Project records and reproduces the metadata you provide. It does not provide legal advice or verify ownership.`

### Step E: Runtime preview

Preview composites the asset with compatible bundled defaults through the shared runtime. The user can inspect idle/walk, four directions, theme presets, and transparent checkerboard. Display exact frame and full-sheet hashes, coverage, and credit record. Validation fails if self-export/self-install produces different pixels or credits.

## 3.7 Validation and Export (`VIEW-PACK-VALIDATION`)

### Validation report

Group results by Pack, Asset, Colors, Coverage, Provenance, Runtime, and Package. Blockers and warnings are separate. Each result has stable code, plain-language consequence, exact owner path, and `Fix` command that navigates and focuses the field.

Export commands are disabled while blockers exist.

### Export

`Export .spritepack` creates the deterministic package and a sibling `<filename>.validation.txt` report. Web downloads both; Electron asks for an approved file destination and writes both atomically where supported.

`Install test copy` serializes the draft, then invokes the same public package validator and repository transaction as Add pack. Authored drafts receive no privileged bypass. Success opens Pack Detail with `Authored locally` origin.

## 4. Dialog and Confirmation Contracts

- Installation summary: safe primary action `Install pack`; Escape cancels.
- Remove unused version: name, ID/version/checksum, bytes; Remove is destructive and never default.
- Activate version: old/new exact identities, affected assets, snapshot promise, output/credit diff; no preselection when incompatibilities exist.
- Delete draft: type draft name; downloaded packages and installed packs unaffected.
- Delete/remove focus returns to next list item or list heading.
- Dialog focus begins at heading or first safe control and is trapped; close restores trigger focus.

## 5. Status and Content Language

Use stable nouns:

- **Bundled** — shipped with application.
- **Installed** — complete global local repository version.
- **Authored locally** — installed via test copy from a local draft.
- **Embedded** — available only inside a project archive; not globally installed.
- **Disabled** — excluded from new choices; existing locks still resolve.
- **Missing** — exact required checksum unavailable.
- **In use** — referenced by at least one local project or active draft test copy.

Do not use `safe`, `trusted`, `verified`, or `license cleared` for user-provided content. Use `validated` only to mean structural/runtime validation completed.

## 6. Accessibility

- WCAG 2.2 AA behavior in both hosts.
- Native buttons, inputs, selects, tables, disclosure, and dialogs first.
- Pack tables have captions, column headers, and row action names including pack/version.
- Token binding table supports Tab through controls; arrow keys remain native within selects/radio groups.
- All swatches include hexadecimal/token text; status is never color-only.
- Validation results link to and focus exact owners.
- File validation and install progress use polite status; blocking errors use alert only once.
- Preview animation obeys reduced motion and never auto-plays when reduced motion is requested.
- Every target is at least 24×24 CSS pixels; primary touch actions aim for 44×44.
- At 200% zoom and a 320 CSS pixel viewport, authoring sections reflow to one column with no horizontal page scroll; source-color table may use a labeled horizontal scroll region.
- Keyboard acceptance covers installation, cancel, filtering, enablement, version activation, remove, authoring, asset configuration, validation navigation, export, recovery, and missing-pack flows.

## 7. Performance Perception

- File selection acknowledges within one animation frame.
- Validation status appears within 100 ms and reports stage changes at least every 500 ms for work lasting over one second.
- Draft edits show Unsaved within one animation frame and Saving after the 750 ms quiet period.
- Image decode/token preview work must not block the UI thread longer than 100 ms continuously; processing uses workers or chunking when needed.

## 8. Explicit UX Non-Goals

No marketplace, remote URL install, drag-and-drop folder watching, pixel editing, arbitrary rig/frame designer, terrain/scenes, non-humanoid authoring, executable plugins, legal clearance, bulk repository conversion, or new engine adapter appears in UPD-002 UI.
