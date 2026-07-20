# UPD-002 Experience Architecture

## Information Architecture

| ID | Object | Contains | Status |
|---|---|---|---|
| IA-PACK-PACKAGE | Portable pack package | manifest, pack document, asset sheets, source-color bindings, provenance, checksums, README | implemented |
| IA-PACK-MANIFEST | Pack manifest | format version, pack schema version, identity, entry inventory, sizes, media types, SHA-256 | implemented |
| IA-PACK-ASSET | Humanoid pack asset | stable ID, slot, sheet reference, coverage, token map, fixed colors, provenance | implemented |
| IA-PACK-VERSION | Installed pack version | pack ID, SemVer, checksum, origin, enabled state, availability, storage, dependent projects | implemented |
| IA-PACK-DRAFT | Pack authoring draft | metadata, source bytes, assets, token mappings, provenance, validation state, revision | implemented |
| IA-PACK-VALIDATION | Pack validation report | stage, stable codes, asset paths, blocking issues, warnings, package summary | implemented |
| IA-PACK-DEPENDENCY | Project pack dependency | exact lock, availability, compatible alternatives, affected project IDs, recovery choices | implemented |
| IA-PACK-PROVENANCE | Pack provenance | author, source, source URL, offered licenses, chosen license, attribution text | implemented |

## Navigation

| ID | Label | Destination | Back behavior | Status |
|---|---|---|---|---|
| NAV-PACKS | Packs | `VIEW-PACK-LIBRARY` | Returns to the prior workspace without changing project locks | implemented |
| NAV-PACK-AUTHOR | Author pack | `VIEW-PACK-AUTHOR` | Preserves the draft and returns to its last completed section | implemented |
| NAV-WORKSPACE | Workspace | `VIEW-WORKSPACE` | Returns to the active project without pack mutation | implemented |

## Views

| ID | Name | Purpose | Information | Status |
|---|---|---|---|---|
| VIEW-PACK-LIBRARY | Pack library | Inspect and manage bundled, installed, embedded, disabled, missing, and in-use packs | `IA-PACK-VERSION`, `IA-PACK-DEPENDENCY` | implemented |
| VIEW-PACK-INSTALL | Pack install review | Validate and summarize an untrusted pack before repository mutation | `IA-PACK-PACKAGE`, `IA-PACK-MANIFEST`, `IA-PACK-VALIDATION`, `IA-PACK-PROVENANCE` | implemented |
| VIEW-PACK-DETAIL | Pack version detail | Inspect content, origin, usage, versions, coverage, storage, and credits | `IA-PACK-VERSION`, `IA-PACK-ASSET`, `IA-PACK-PROVENANCE`, `IA-PACK-DEPENDENCY` | implemented |
| VIEW-PACK-AUTHOR | Pack authoring workspace | Build a current-profile humanoid pack without editing JSON | `IA-PACK-DRAFT`, `IA-PACK-ASSET`, `IA-PACK-PROVENANCE` | implemented |
| VIEW-PACK-ASSET | Asset configuration | Configure one sheet, slot, coverage, color bindings, and preview | `IA-PACK-ASSET`, `IA-PACK-VALIDATION` | implemented |
| VIEW-PACK-VALIDATION | Pack validation and export | Resolve blockers and export or self-install a deterministic package | `IA-PACK-VALIDATION`, `IA-PACK-PACKAGE`, `IA-PACK-PROVENANCE` | implemented |
| VIEW-PACK-RECOVERY | Missing pack recovery | Recover an exact project lock without silent substitution | `IA-PACK-DEPENDENCY`, `IA-PACK-VALIDATION` | implemented |
| VIEW-WORKSPACE | Character workspace | Compose and export with bundled or installed packs through one renderer | `IA-PACK-VERSION`, `IA-PACK-ASSET` | implemented |

## UI Inventory

| ID | View | Role | Accessible name | Status |
|---|---|---|---|---|
| UI-PACK-IMPORT | `VIEW-PACK-LIBRARY` | button | Add pack | implemented |
| UI-PACK-INSTALL-SUMMARY | `VIEW-PACK-INSTALL` | region | Pack install summary | implemented |
| UI-PACK-INSTALL | `VIEW-PACK-INSTALL` | button | Install pack | implemented |
| UI-PACK-ERROR | `VIEW-PACK-INSTALL` | alert | Pack validation error | implemented |
| UI-PACK-LIST | `VIEW-PACK-LIBRARY` | list | Local packs | implemented |
| UI-PACK-ENABLE | `VIEW-PACK-DETAIL` | switch | Enable for new selections | implemented |
| UI-PACK-VERSION | `VIEW-PACK-DETAIL` | list | Installed versions | implemented |
| UI-PACK-ACTIVATE | `VIEW-PACK-DETAIL` | button | Use version in project | implemented |
| UI-PACK-REMOVE | `VIEW-PACK-DETAIL` | button | Remove pack version | implemented |
| UI-PACK-DEPENDENCIES | `VIEW-PACK-DETAIL` | region | Dependent projects | implemented |
| UI-PACK-LOCATE | `VIEW-PACK-RECOVERY` | button | Locate exact pack | implemented |
| UI-PACK-REPLACE-COPY | `VIEW-PACK-RECOVERY` | button | Replace in a copy | implemented |
| UI-PACK-DRAFT-NEW | `VIEW-PACK-LIBRARY` | button | Create pack | implemented |
| UI-PACK-ASSET-IMPORT | `VIEW-PACK-AUTHOR` | button | Add layer sheet | implemented |
| UI-PACK-ASSET-CONFIG | `VIEW-PACK-ASSET` | group | Asset configuration | implemented |
| UI-PACK-TOKEN-MAP | `VIEW-PACK-ASSET` | table | Source color bindings | implemented |
| UI-PACK-PREVIEW | `VIEW-PACK-ASSET` | img | Authored asset preview | implemented |
| UI-PACK-PROVENANCE | `VIEW-PACK-ASSET` | group | Source and license | implemented |
| UI-PACK-DRAFT-STATUS | `VIEW-PACK-AUTHOR` | status | Draft save status | implemented |
| UI-PACK-DRAFT-RECOVERY | `VIEW-PACK-AUTHOR` | button | Download draft recovery | implemented |
| UI-PACK-VALIDATE | `VIEW-PACK-VALIDATION` | button | Validate pack | implemented |
| UI-PACK-VALIDATION-REPORT | `VIEW-PACK-VALIDATION` | region | Validation report | implemented |
| UI-PACK-EXPORT | `VIEW-PACK-VALIDATION` | button | Export .spritepack | implemented |
| UI-PACK-SELF-INSTALL | `VIEW-PACK-VALIDATION` | button | Install test copy | implemented |
| UI-WORKSPACE-PACK | `VIEW-WORKSPACE` | combobox | Content pack | implemented |

## Objective Expected Behaviors

| ID | Flow | Steps | Oracle | Status |
|---|---|---|---|---|
| EB-PACK-INSTALL-CHOOSE | `TF-PACK-INSTALL` | `S1` | Add pack opens a native or browser file chooser limited to .spritepack; cancellation returns focus and mutates nothing. | implemented |
| EB-PACK-INSTALL-INSPECT | `TF-PACK-INSTALL` | `S2` | Validation completes before install is enabled and shows exact ID, version, checksum, subject profile, asset count, complete coverage, token bindings, licenses, expanded size, warnings, and duplicate state. | implemented |
| EB-PACK-INSTALL-COMMIT | `TF-PACK-INSTALL` | `S3` | Install commits manifest, pack document, provenance, and content-addressed PNG bytes in one host transaction, reads them back, and announces the installed checksum. | implemented |
| EB-PACK-INSTALL-AVAILABLE | `TF-PACK-INSTALL` | `S4` | The installed pack appears in the pack library and new-recipe selector and renders through the shared runtime with no application reload or renderer branch. | implemented |
| EB-PACK-INVALID-REJECT | `TF-PACK-INVALID` | `S1` | Every named malformed, hostile, incompatible, or over-limit fixture fails at a documented validation stage with stable pack-invalid, pack-limit, unsupported-version, unsupported-license, or image-invalid code before mutation. | implemented |
| EB-PACK-INVALID-PRESERVE | `TF-PACK-INVALID` | `S2` | Existing packs, pack blobs, projects, drafts, and the selected source file remain byte-identical after rejection or interruption. | implemented |
| EB-PACK-INVALID-RECOVER | `TF-PACK-INVALID` | `S3` | The error surface names the stage, offending entry or field, observed and allowed values, and offers choose another file, download validation report, or cancel. | implemented |
| EB-PACK-LIBRARY-LIST | `TF-PACK-LIBRARY` | `S1` | Pack library lists every local version by name, ID, SemVer, checksum prefix, origin, enabled state, storage, availability, and dependent-project count with deterministic sorting and filters. | implemented |
| EB-PACK-LIBRARY-DETAIL | `TF-PACK-LIBRARY` | `S2` | Pack detail shows assets by slot, runtime coverage, token mappings, source/license records, installed versions, and all exact project dependencies. | implemented |
| EB-PACK-LIBRARY-ENABLE | `TF-PACK-LIBRARY` | `S3` | Disabling removes a pack only from new selections; existing locked projects continue rendering and exporting, and re-enabling restores selection availability. | implemented |
| EB-PACK-UPDATE-SIDE-BY-SIDE | `TF-PACK-UPDATE` | `S1` | A different valid SemVer installs beside prior versions; the same ID+version+checksum is idempotent and the same ID+version with a different checksum is rejected as pack-conflict. | implemented |
| EB-PACK-UPDATE-IMPACT | `TF-PACK-UPDATE` | `S2` | Version detail identifies added, removed, and changed asset IDs and names every project that would become incompatible before any project action is enabled. | implemented |
| EB-PACK-UPDATE-ACTIVATE | `TF-PACK-UPDATE` | `S3` | Use version creates a named pre-change snapshot, validates every selected asset, previews semantic/render/credit differences, and changes only the active project's exact lock after explicit confirmation. | implemented |
| EB-PACK-UPDATE-ROLLBACK | `TF-PACK-UPDATE` | `S4` | Cancel writes nothing; restoring the pre-change snapshot restores the prior exact lock, recipe, pixels, and credits. | implemented |
| EB-PACK-REMOVE-UNUSED | `TF-PACK-REMOVE` | `S1` | An unused non-bundled version removes only after a confirmation naming identity, checksum, and bytes; shared blobs remain while referenced by any other version. | implemented |
| EB-PACK-REMOVE-IN-USE | `TF-PACK-REMOVE` | `S2` | An in-use, bundled, embedded-only, or currently authoring test version cannot be removed; the UI names every dependency and offers open project, export backup, or cancel. | implemented |
| EB-PACK-REMOVE-FAILURE | `TF-PACK-REMOVE` | `S3` | Failed removal retains the complete version and blobs, reports a stable error, and leaves dependent projects renderable. | implemented |
| EB-PACK-MISSING-BLOCK | `TF-PACK-MISSING-RECOVERY` | `S1` | Opening a project with an unavailable lock preserves and displays the project but blocks deterministic preview/export, names exact ID/version/checksum, and never substitutes another version. | implemented |
| EB-PACK-MISSING-LOCATE | `TF-PACK-MISSING-RECOVERY` | `S2` | Locate exact pack accepts only a package whose identity and payload checksum match the lock, installs it transactionally, and resumes the unchanged project. | implemented |
| EB-PACK-MISSING-COPY | `TF-PACK-MISSING-RECOVERY` | `S3` | Replace in a copy requires an installed compatible version, previews missing assets and output changes, creates a new project ID with checkpoint, and leaves the original project and lock unchanged. | implemented |
| EB-PACK-MISSING-CANCEL | `TF-PACK-MISSING-RECOVERY` | `S4` | Cancel returns to the blocked project with all source data intact and no pack or project mutation. | implemented |
| EB-PACK-AUTHOR-DRAFT | `TF-PACK-AUTHOR` | `S1` | Create pack produces a local draft with generated stable draft ID, user-defined canonical pack ID, valid SemVer, humanoid-lpc-64 profile, revision zero, and visible Unsaved/Saving/Saved state. | implemented |
| EB-PACK-AUTHOR-IMPORT | `TF-PACK-AUTHOR` | `S2` | Add layer sheet accepts PNG only, verifies signature and exact 256x512 RGBA dimensions before decode, computes SHA-256, stores original bytes, and rejects duplicates without partial assets. | implemented |
| EB-PACK-AUTHOR-CONFIGURE | `TF-PACK-AUTHOR` | `S3` | Asset configuration requires unique canonical ID, name, description, one current humanoid slot, and complete idle/walk four-direction profile; errors remain adjacent and retain input. | implemented |
| EB-PACK-AUTHOR-TOKENS | `TF-PACK-AUTHOR` | `S4` | The color table lists every distinct non-transparent RGBA color with pixel count and requires fixed or token+shade mapping; no hidden automatic mapping is committed. | implemented |
| EB-PACK-AUTHOR-PROVENANCE | `TF-PACK-AUTHOR` | `S5` | Every asset requires author, source title, HTTPS source URL, offered supported licenses, one chosen offered license, and attribution text when the chosen license requires it. | implemented |
| EB-PACK-AUTHOR-PREVIEW | `TF-PACK-AUTHOR` | `S6` | Preview uses the shared installed-pack renderer and displays idle/walk in all directions, token theme changes, pixel hash, coverage, and generated credit record from the draft bytes. | implemented |
| EB-PACK-DRAFT-AUTOSAVE | `TF-PACK-DRAFT-RECOVERY` | `S1` | Meaningful metadata, asset, mapping, and provenance edits mark Unsaved within one frame and commit draft metadata plus referenced source blobs after a 750 ms quiet period with integer revision conflict checks. | implemented |
| EB-PACK-DRAFT-REOPEN | `TF-PACK-DRAFT-RECOVERY` | `S2` | Browser restart or Electron relaunch reopens the latest committed draft, original imported bytes, active asset, and recomputed validation report without changing draft bytes. | implemented |
| EB-PACK-DRAFT-FAILURE | `TF-PACK-DRAFT-RECOVERY` | `S3` | Quota, write, decode, stale-revision, or read-back failure retains dirty state and last committed draft and offers retry, save copy, remove offending asset, download recovery, or cancel as applicable. | implemented |
| EB-PACK-VALIDATE-REPORT | `TF-PACK-VALIDATE-EXPORT` | `S1` | Validate checks package limits, identity, graph references, PNGs, slots, full coverage, every color disposition, provenance/licenses, runtime preview, deterministic credits, and canonical serialization and groups results by exact asset/field. | implemented |
| EB-PACK-VALIDATE-NAVIGATE | `TF-PACK-VALIDATE-EXPORT` | `S2` | Activating a validation item opens the owning section, focuses the exact field or asset, preserves all draft inputs, and removes the item only after successful revalidation. | implemented |
| EB-PACK-EXPORT-DETERMINISTIC | `TF-PACK-VALIDATE-EXPORT` | `S3` | Export is enabled only with zero blockers and emits one deterministic .spritepack plus text validation report; unchanged drafts produce identical payload entry hashes on both hosts. | implemented |
| EB-PACK-SELF-INSTALL | `TF-PACK-VALIDATE-EXPORT` | `S4` | Install test copy validates the exported bytes through the public install path, marks origin authored-local, and makes the pack available without granting the draft special runtime behavior. | implemented |
| EB-PACK-CROSS-WEB-DESKTOP | `TF-PACK-CROSS-HOST` | `S1`, `S2` | A web-authored .spritepack installs in packaged Electron with identical canonical payload hashes, asset inventory, preview hashes, and credits. | implemented |
| EB-PACK-CROSS-PROJECT | `TF-PACK-CROSS-HOST` | `S3` | A project using the local pack transfers in .spriteproject with exact lock and embedded required content, opens offline in the other host, and produces identical generic/Godot outputs. | implemented |
| EB-PACK-CROSS-RETURN | `TF-PACK-CROSS-HOST` | `S4` | Electron re-exported pack and project reopen in web without conversion, host metadata leakage, payload drift, or duplicate installation. | implemented |
| EB-PACK-OFFLINE-READY | `TF-PACK-OFFLINE` | `S1` | Pack detail reports Ready offline only when manifest, provenance, and every referenced PNG checksum resolve locally. | implemented |
| EB-PACK-OFFLINE-USE | `TF-PACK-OFFLINE` | `S2` | After network disconnect and restart, installed pack browsing, selection, token recolor, preview, save, archive, generic export, Godot export, and credits complete with zero required network requests. | implemented |
| EB-PACK-OFFLINE-MISSING | `TF-PACK-OFFLINE` | `S3` | A deliberately incomplete local install reports the exact missing checksum and blocks use/export without fetching or substituting content. | implemented |

## Binding References

- `product-design-spec.md` owns layout, hierarchy, interaction, responsive, content, and accessibility contracts.
- `engineering-spec.md` owns formats, schemas, repositories, renderer, bridge, limits, state transitions, failures, and migration.
- `quality-scenarios.md` and `release-gate.md` own measurable evidence and promotion arithmetic.
