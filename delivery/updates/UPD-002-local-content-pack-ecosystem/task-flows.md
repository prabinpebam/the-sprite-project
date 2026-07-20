# UPD-002 Task Flows

Every flow is accepted only through visible interaction on its declared host. Affected UPD-001 flows remain regression obligations.

## TF-PACK-INSTALL

- **Host:** shared
- **Scenarios:** `SC-PACK-FIRST-INSTALL`
- **Capabilities:** `UC-PACK-CHOOSE-FILE`, `UC-PACK-INSPECT`, `UC-PACK-INSTALL`
- **Preconditions:** Pack library open; Local compatible .spritepack available
- **Completion:** Exact pack version is installed, offline-ready, and selectable
- **Status:** implemented

| Step | User action | View | UI | Navigation | Objective behavior |
|---|---|---|---|---|---|
| S1 | Choose Add pack and select local package | `VIEW-PACK-LIBRARY` | `UI-PACK-IMPORT` | `NAV-PACKS` | `EB-PACK-INSTALL-CHOOSE`: Add pack opens a native or browser file chooser limited to .spritepack; cancellation returns focus and mutates nothing. |
| S2 | Review validated package summary | `VIEW-PACK-INSTALL` | `UI-PACK-INSTALL-SUMMARY` | No route change | `EB-PACK-INSTALL-INSPECT`: Validation completes before install is enabled and shows exact ID, version, checksum, subject profile, asset count, complete coverage, token bindings, licenses, expanded size, warnings, and duplicate state. |
| S3 | Install pack | `VIEW-PACK-INSTALL` | `UI-PACK-INSTALL` | No route change | `EB-PACK-INSTALL-COMMIT`: Install commits manifest, pack document, provenance, and content-addressed PNG bytes in one host transaction, reads them back, and announces the installed checksum. |
| S4 | Create or open recipe and select installed pack | `VIEW-WORKSPACE` | `UI-WORKSPACE-PACK` | `NAV-WORKSPACE` | `EB-PACK-INSTALL-AVAILABLE`: The installed pack appears in the pack library and new-recipe selector and renders through the shared runtime with no application reload or renderer branch. |

## TF-PACK-INVALID

- **Host:** shared
- **Scenarios:** `SC-PACK-INVALID`
- **Capabilities:** `UC-PACK-CHOOSE-FILE`, `UC-PACK-INSPECT`, `UC-PACK-REJECT`
- **Preconditions:** Existing repository valid; Adversarial package available
- **Completion:** Invalid package is rejected with sources and repository unchanged
- **Status:** implemented

| Step | User action | View | UI | Navigation | Objective behavior |
|---|---|---|---|---|---|
| S1 | Select invalid or hostile package | `VIEW-PACK-INSTALL` | `UI-PACK-ERROR` | `NAV-PACKS` | `EB-PACK-INVALID-REJECT`: Every named malformed, hostile, incompatible, or over-limit fixture fails at a documented validation stage with stable pack-invalid, pack-limit, unsupported-version, unsupported-license, or image-invalid code before mutation. |
| S2 | Inspect repository and source preservation | `VIEW-PACK-LIBRARY` | `UI-PACK-LIST` | No route change | `EB-PACK-INVALID-PRESERVE`: Existing packs, pack blobs, projects, drafts, and the selected source file remain byte-identical after rejection or interruption. |
| S3 | Choose recovery or cancel | `VIEW-PACK-INSTALL` | `UI-PACK-ERROR` | No route change | `EB-PACK-INVALID-RECOVER`: The error surface names the stage, offending entry or field, observed and allowed values, and offers choose another file, download validation report, or cancel. |

## TF-PACK-LIBRARY

- **Host:** shared
- **Scenarios:** `SC-PACK-LIBRARY`
- **Capabilities:** `UC-PACK-LIST`, `UC-PACK-ENABLE`
- **Preconditions:** At least one bundled and one local pack
- **Completion:** Developer understands and controls local pack availability
- **Status:** implemented

| Step | User action | View | UI | Navigation | Objective behavior |
|---|---|---|---|---|---|
| S1 | Open Packs and filter local versions | `VIEW-PACK-LIBRARY` | `UI-PACK-LIST` | `NAV-PACKS` | `EB-PACK-LIBRARY-LIST`: Pack library lists every local version by name, ID, SemVer, checksum prefix, origin, enabled state, storage, availability, and dependent-project count with deterministic sorting and filters. |
| S2 | Open a pack version detail | `VIEW-PACK-DETAIL` | `UI-PACK-DEPENDENCIES` | No route change | `EB-PACK-LIBRARY-DETAIL`: Pack detail shows assets by slot, runtime coverage, token mappings, source/license records, installed versions, and all exact project dependencies. |
| S3 | Disable then enable for new selections | `VIEW-PACK-DETAIL` | `UI-PACK-ENABLE` | No route change | `EB-PACK-LIBRARY-ENABLE`: Disabling removes a pack only from new selections; existing locked projects continue rendering and exporting, and re-enabling restores selection availability. |

## TF-PACK-UPDATE

- **Host:** shared
- **Scenarios:** `SC-PACK-UPDATE`
- **Capabilities:** `UC-PACK-INSTALL-VERSION`, `UC-PACK-ACTIVATE-VERSION`
- **Preconditions:** Version 1 installed and used; Version 2 package available
- **Completion:** Version 2 coexists and explicit project activation is reversible
- **Status:** implemented

| Step | User action | View | UI | Navigation | Objective behavior |
|---|---|---|---|---|---|
| S1 | Install second pack version | `VIEW-PACK-INSTALL` | `UI-PACK-INSTALL` | `NAV-PACKS` | `EB-PACK-UPDATE-SIDE-BY-SIDE`: A different valid SemVer installs beside prior versions; the same ID+version+checksum is idempotent and the same ID+version with a different checksum is rejected as pack-conflict. |
| S2 | Inspect version and project impact | `VIEW-PACK-DETAIL` | `UI-PACK-VERSION` | No route change | `EB-PACK-UPDATE-IMPACT`: Version detail identifies added, removed, and changed asset IDs and names every project that would become incompatible before any project action is enabled. |
| S3 | Use version in one project | `VIEW-PACK-DETAIL` | `UI-PACK-ACTIVATE` | No route change | `EB-PACK-UPDATE-ACTIVATE`: Use version creates a named pre-change snapshot, validates every selected asset, previews semantic/render/credit differences, and changes only the active project's exact lock after explicit confirmation. |
| S4 | Cancel or restore checkpoint | `VIEW-WORKSPACE` | `UI-WORKSPACE-PACK` | `NAV-WORKSPACE` | `EB-PACK-UPDATE-ROLLBACK`: Cancel writes nothing; restoring the pre-change snapshot restores the prior exact lock, recipe, pixels, and credits. |

## TF-PACK-REMOVE

- **Host:** shared
- **Scenarios:** `SC-PACK-REMOVE`
- **Capabilities:** `UC-PACK-REMOVE`, `UC-PACK-PROTECT-IN-USE`
- **Preconditions:** Installed local pack versions exist
- **Completion:** Only unused safe content removes
- **Status:** implemented

| Step | User action | View | UI | Navigation | Objective behavior |
|---|---|---|---|---|---|
| S1 | Remove unused version after confirmation | `VIEW-PACK-DETAIL` | `UI-PACK-REMOVE` | `NAV-PACKS` | `EB-PACK-REMOVE-UNUSED`: An unused non-bundled version removes only after a confirmation naming identity, checksum, and bytes; shared blobs remain while referenced by any other version. |
| S2 | Attempt removal of in-use version | `VIEW-PACK-DETAIL` | `UI-PACK-DEPENDENCIES` | No route change | `EB-PACK-REMOVE-IN-USE`: An in-use, bundled, embedded-only, or currently authoring test version cannot be removed; the UI names every dependency and offers open project, export backup, or cancel. |
| S3 | Simulate failed repository removal | `VIEW-PACK-DETAIL` | `UI-PACK-ERROR` | No route change | `EB-PACK-REMOVE-FAILURE`: Failed removal retains the complete version and blobs, reports a stable error, and leaves dependent projects renderable. |

## TF-PACK-MISSING-RECOVERY

- **Host:** shared
- **Scenarios:** `SC-PACK-MISSING-RECOVERY`
- **Capabilities:** `UC-PACK-RECOVER-MISSING`, `UC-PACK-REPLACE-COPY`
- **Preconditions:** Project requires unavailable exact pack
- **Completion:** Exact content resumes project or replacement occurs only in a copy
- **Status:** implemented

| Step | User action | View | UI | Navigation | Objective behavior |
|---|---|---|---|---|---|
| S1 | Open project with missing exact lock | `VIEW-PACK-RECOVERY` | `UI-PACK-DEPENDENCIES` | No route change | `EB-PACK-MISSING-BLOCK`: Opening a project with an unavailable lock preserves and displays the project but blocks deterministic preview/export, names exact ID/version/checksum, and never substitutes another version. |
| S2 | Locate exact pack | `VIEW-PACK-RECOVERY` | `UI-PACK-LOCATE` | No route change | `EB-PACK-MISSING-LOCATE`: Locate exact pack accepts only a package whose identity and payload checksum match the lock, installs it transactionally, and resumes the unchanged project. |
| S3 | Replace compatible version in a copy | `VIEW-PACK-RECOVERY` | `UI-PACK-REPLACE-COPY` | No route change | `EB-PACK-MISSING-COPY`: Replace in a copy requires an installed compatible version, previews missing assets and output changes, creates a new project ID with checkpoint, and leaves the original project and lock unchanged. |
| S4 | Cancel recovery | `VIEW-PACK-RECOVERY` | `UI-PACK-DEPENDENCIES` | No route change | `EB-PACK-MISSING-CANCEL`: Cancel returns to the blocked project with all source data intact and no pack or project mutation. |

## TF-PACK-AUTHOR

- **Host:** shared
- **Scenarios:** `SC-PACK-AUTHOR-START`, `SC-PACK-AUTHOR-TOKENS`, `SC-PACK-AUTHOR-PROVENANCE`
- **Capabilities:** `UC-PACK-DRAFT-CREATE`, `UC-PACK-ASSET-IMPORT`, `UC-PACK-ASSET-CONFIGURE`, `UC-PACK-TOKEN-BIND`, `UC-PACK-PROVENANCE`, `UC-PACK-PREVIEW`
- **Preconditions:** User owns or may redistribute compatible PNG art
- **Completion:** Draft previews through runtime with complete metadata and provenance
- **Status:** implemented

| Step | User action | View | UI | Navigation | Objective behavior |
|---|---|---|---|---|---|
| S1 | Choose Create pack and enter identity | `VIEW-PACK-LIBRARY` | `UI-PACK-DRAFT-NEW` | `NAV-PACK-AUTHOR` | `EB-PACK-AUTHOR-DRAFT`: Create pack produces a local draft with generated stable draft ID, user-defined canonical pack ID, valid SemVer, humanoid-lpc-64 profile, revision zero, and visible Unsaved/Saving/Saved state. |
| S2 | Add LPC-compatible layer sheet | `VIEW-PACK-AUTHOR` | `UI-PACK-ASSET-IMPORT` | No route change | `EB-PACK-AUTHOR-IMPORT`: Add layer sheet accepts PNG only, verifies signature and exact 256x512 RGBA dimensions before decode, computes SHA-256, stores original bytes, and rejects duplicates without partial assets. |
| S3 | Configure asset identity and slot | `VIEW-PACK-ASSET` | `UI-PACK-ASSET-CONFIG` | No route change | `EB-PACK-AUTHOR-CONFIGURE`: Asset configuration requires unique canonical ID, name, description, one current humanoid slot, and complete idle/walk four-direction profile; errors remain adjacent and retain input. |
| S4 | Classify fixed and semantic colors | `VIEW-PACK-ASSET` | `UI-PACK-TOKEN-MAP` | No route change | `EB-PACK-AUTHOR-TOKENS`: The color table lists every distinct non-transparent RGBA color with pixel count and requires fixed or token+shade mapping; no hidden automatic mapping is committed. |
| S5 | Enter source and license metadata | `VIEW-PACK-ASSET` | `UI-PACK-PROVENANCE` | No route change | `EB-PACK-AUTHOR-PROVENANCE`: Every asset requires author, source title, HTTPS source URL, offered supported licenses, one chosen offered license, and attribution text when the chosen license requires it. |
| S6 | Preview runtime animation and credits | `VIEW-PACK-ASSET` | `UI-PACK-PREVIEW` | No route change | `EB-PACK-AUTHOR-PREVIEW`: Preview uses the shared installed-pack renderer and displays idle/walk in all directions, token theme changes, pixel hash, coverage, and generated credit record from the draft bytes. |

## TF-PACK-DRAFT-RECOVERY

- **Host:** shared
- **Scenarios:** `SC-PACK-AUTHOR-RECOVERY`
- **Capabilities:** `UC-PACK-ASSET-IMPORT`, `UC-PACK-DRAFT-SAVE`, `UC-PACK-DRAFT-RECOVER`, `UC-PACK-VALIDATE`
- **Preconditions:** Pack draft contains meaningful work
- **Completion:** Draft persists or fails with operable recovery
- **Status:** implemented

| Step | User action | View | UI | Navigation | Objective behavior |
|---|---|---|---|---|---|
| S1 | Edit draft and wait for autosave | `VIEW-PACK-AUTHOR` | `UI-PACK-DRAFT-STATUS` | `NAV-PACK-AUTHOR` | `EB-PACK-DRAFT-AUTOSAVE`: Meaningful metadata, asset, mapping, and provenance edits mark Unsaved within one frame and commit draft metadata plus referenced source blobs after a 750 ms quiet period with integer revision conflict checks. |
| S2 | Reload or reopen draft | `VIEW-PACK-AUTHOR` | `UI-PACK-DRAFT-STATUS` | No route change | `EB-PACK-DRAFT-REOPEN`: Browser restart or Electron relaunch reopens the latest committed draft, original imported bytes, active asset, and recomputed validation report without changing draft bytes. |
| S3 | Trigger and recover from failed save or validation | `VIEW-PACK-AUTHOR` | `UI-PACK-DRAFT-RECOVERY` | No route change | `EB-PACK-DRAFT-FAILURE`: Quota, write, decode, stale-revision, or read-back failure retains dirty state and last committed draft and offers retry, save copy, remove offending asset, download recovery, or cancel as applicable. |

## TF-PACK-VALIDATE-EXPORT

- **Host:** shared
- **Scenarios:** `SC-PACK-AUTHOR-PROVENANCE`, `SC-PACK-AUTHOR-RECOVERY`
- **Capabilities:** `UC-PACK-VALIDATE`, `UC-PACK-EXPORT`, `UC-PACK-SELF-INSTALL`
- **Preconditions:** Draft contains one or more configured assets
- **Completion:** Deterministic pack exports and installs through public path
- **Status:** implemented

| Step | User action | View | UI | Navigation | Objective behavior |
|---|---|---|---|---|---|
| S1 | Validate complete draft | `VIEW-PACK-VALIDATION` | `UI-PACK-VALIDATE` | `NAV-PACK-AUTHOR` | `EB-PACK-VALIDATE-REPORT`: Validate checks package limits, identity, graph references, PNGs, slots, full coverage, every color disposition, provenance/licenses, runtime preview, deterministic credits, and canonical serialization and groups results by exact asset/field. |
| S2 | Navigate to and repair blockers | `VIEW-PACK-VALIDATION` | `UI-PACK-VALIDATION-REPORT` | No route change | `EB-PACK-VALIDATE-NAVIGATE`: Activating a validation item opens the owning section, focuses the exact field or asset, preserves all draft inputs, and removes the item only after successful revalidation. |
| S3 | Export package and report | `VIEW-PACK-VALIDATION` | `UI-PACK-EXPORT` | No route change | `EB-PACK-EXPORT-DETERMINISTIC`: Export is enabled only with zero blockers and emits one deterministic .spritepack plus text validation report; unchanged drafts produce identical payload entry hashes on both hosts. |
| S4 | Install exported pack as test copy | `VIEW-PACK-VALIDATION` | `UI-PACK-SELF-INSTALL` | No route change | `EB-PACK-SELF-INSTALL`: Install test copy validates the exported bytes through the public install path, marks origin authored-local, and makes the pack available without granting the draft special runtime behavior. |

## TF-PACK-CROSS-HOST

- **Host:** cross-host
- **Scenarios:** `SC-PACK-CROSS-HOST`, `SC-PACK-EMBEDDED-OFFLINE`
- **Capabilities:** `UC-PACK-EXPORT`, `UC-PACK-CROSS-HOST`
- **Preconditions:** Web-authored valid pack and project use it
- **Completion:** Pack and project round trip with exact runtime and output parity
- **Status:** implemented

| Step | User action | View | UI | Navigation | Objective behavior |
|---|---|---|---|---|---|
| S1 | Export authored pack from web | `VIEW-PACK-VALIDATION` | `UI-PACK-EXPORT` | `NAV-PACK-AUTHOR` | `EB-PACK-CROSS-WEB-DESKTOP`: A web-authored .spritepack installs in packaged Electron with identical canonical payload hashes, asset inventory, preview hashes, and credits. |
| S2 | Install pack in Electron | `VIEW-PACK-INSTALL` | `UI-PACK-INSTALL` | `NAV-PACKS` | `EB-PACK-CROSS-WEB-DESKTOP`: A web-authored .spritepack installs in packaged Electron with identical canonical payload hashes, asset inventory, preview hashes, and credits. |
| S3 | Transfer and export dependent project | `VIEW-WORKSPACE` | `UI-WORKSPACE-PACK` | `NAV-WORKSPACE` | `EB-PACK-CROSS-PROJECT`: A project using the local pack transfers in .spriteproject with exact lock and embedded required content, opens offline in the other host, and produces identical generic/Godot outputs. |
| S4 | Re-export from Electron and reopen in web | `VIEW-PACK-LIBRARY` | `UI-PACK-LIST` | `NAV-PACKS` | `EB-PACK-CROSS-RETURN`: Electron re-exported pack and project reopen in web without conversion, host metadata leakage, payload drift, or duplicate installation. |

## TF-PACK-OFFLINE

- **Host:** web
- **Scenarios:** `SC-PACK-LIBRARY`, `SC-PACK-CROSS-HOST`
- **Capabilities:** `UC-PACK-LIST`, `UC-PACK-INSTALL`, `UC-PACK-CROSS-HOST`
- **Preconditions:** Pack installed and app shell loaded online once
- **Completion:** Pack workflows and dependent exports complete offline
- **Status:** implemented

| Step | User action | View | UI | Navigation | Objective behavior |
|---|---|---|---|---|---|
| S1 | Confirm pack offline readiness | `VIEW-PACK-DETAIL` | `UI-PACK-DEPENDENCIES` | `NAV-PACKS` | `EB-PACK-OFFLINE-READY`: Pack detail reports Ready offline only when manifest, provenance, and every referenced PNG checksum resolve locally. |
| S2 | Disconnect, restart, compose, save, and export | `VIEW-WORKSPACE` | `UI-WORKSPACE-PACK` | `NAV-WORKSPACE` | `EB-PACK-OFFLINE-USE`: After network disconnect and restart, installed pack browsing, selection, token recolor, preview, save, archive, generic export, Godot export, and credits complete with zero required network requests. |
| S3 | Open fixture with missing local blob | `VIEW-PACK-RECOVERY` | `UI-PACK-DEPENDENCIES` | No route change | `EB-PACK-OFFLINE-MISSING`: A deliberately incomplete local install reports the exact missing checksum and blocks use/export without fetching or substituting content. |
