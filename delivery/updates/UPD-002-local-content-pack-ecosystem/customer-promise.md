# UPD-002 Customer Promises

**Update:** Local Content Pack Ecosystem (UPD-002)

**Baseline:** 4e890b082d4df3b2758cdcc27f7f905bfee3afe0 / RUN-UPD001-001

**Status:** implemented

**Target user:** Solo and small-team 2D game developers and technical artists who need to add legally traceable humanoid content without waiting for an application release

**Quality gate:** A compatible third-party-style humanoid pack can be authored, validated, installed, versioned, used offline, transferred between hosts, removed safely, and credited exactly without renderer branches or silent project drift

## CP-PACK-INSTALL - A developer can inspect and install a compatible local humanoid content pack without an application release.

- **Host:** shared
- **User:** Developer extending the available character catalog
- **Context:** The developer has a local .spritepack file from themselves or another creator
- **Trigger:** They choose Add pack from the pack library
- **Observable outcome:** The product validates the complete package before mutation, shows identity, version, coverage, token bindings, provenance, and risks, then installs the exact content for offline use
- **Quality expectation:** Install is transactional, deterministic, host-consistent, and completes within 10 seconds for the maximum supported package on the reference machine
- **Recovery expectation:** Invalid, incompatible, duplicate, oversized, or interrupted installs preserve the source file and existing pack repository and return a stable error with a next action
- **Acceptance evidence:** Shared adversarial fixtures plus actual-UI install, rejection, update, removal, and offline runs pass on web and packaged Electron
- **Status:** implemented

## CP-PACK-AUTHOR - A technical artist can turn LPC-compatible humanoid layer sheets into a reusable, token-aware, legally attributed pack without writing JSON.

- **Host:** shared
- **User:** Technical artist or developer with compatible original or redistributable layer art
- **Context:** The source art follows the current 64px humanoid idle/walk sheet profile
- **Trigger:** They create a pack draft and import one or more PNG layer sheets
- **Observable outcome:** A guided workflow captures metadata, slots, fixed and token colors, coverage, source and license information, previews the exact runtime composition, and exports a deterministic .spritepack
- **Quality expectation:** Drafts autosave locally, validation points to exact assets and fields, and exported bytes are reproducible from an unchanged draft
- **Recovery expectation:** Decode, validation, quota, interruption, or export failure retains the draft and original imports and offers retry, remove offending asset, or export recovery data
- **Acceptance evidence:** Actual-UI authoring, reload, validation, correction, preview, export, and self-install flows pass with exact render and credit fixtures
- **Status:** implemented

## CP-PACK-LIFECYCLE - A developer can manage installed pack versions without silently changing or stranding existing projects.

- **Host:** shared
- **User:** Returning developer with projects locked to installed content
- **Context:** One or more local packs and projects exist
- **Trigger:** They inspect, enable, disable, update, activate, or remove a pack
- **Observable outcome:** Versions install side by side, projects preserve exact locks, destructive actions expose affected projects, and missing locks have explicit locate, install, replace-copy, or cancel recovery
- **Quality expectation:** No lifecycle command mutates project pack locks implicitly; current projects and last-known-good content remain available through failures
- **Recovery expectation:** In-use removal is blocked; unavailable content leaves the project intact in a deterministic blocked state
- **Acceptance evidence:** Version, dependency, remove, missing-lock, rollback, and regression fixtures pass on both hosts
- **Status:** implemented

## CP-PACK-PORTABILITY - A developer can move authored packs and projects that use them between web and Electron without content, rendering, or provenance drift.

- **Host:** cross-host
- **User:** Developer using both local-first hosts
- **Context:** A project references an installed local pack
- **Trigger:** They export/import a .spritepack or transfer a .spriteproject containing embedded required content
- **Observable outcome:** Both hosts resolve the same pack identity and bytes, produce identical render and export hashes, and generate the same merged credits
- **Quality expectation:** Canonical pack payload hashes, project locks, selected assets, runtime pixels, and credits match exactly across hosts
- **Recovery expectation:** A missing, conflicting, or tampered pack fails before project mutation and preserves both sources
- **Acceptance evidence:** Bidirectional pack and project round trips pass from actual web and packaged Electron UIs
- **Status:** implemented

## Review Boundary

These promises are approved and implementation is authorized under LOCK-UPD-002-001. Status promotion remains evidence-owned; approval is not implementation or verification.
