# UPD-001 Impact Analysis

## Summary

UPD-001 adds project-library, persistence, backup, desktop-folder, and cross-host portability behavior. It retains the verified creative workflow and export semantics. It changes the host boundary but does not add cloud services, collaboration, live link, process launch, or new content-generation capabilities.

## Baseline Classification

| Classification | Baseline area | Update action |
|---|---|---|
| Retained | Composition, themes, preview, provenance, generic export, Godot export, recovery semantics | Keep behavior and rerun affected regression flows on web and desktop hosts |
| Changed | Browser persistence currently implemented directly through localStorage | Supersede with IndexedDB project repository; localStorage becomes preferences only |
| Changed | One current local project | Add a browser project library and desktop recent-project list |
| Added | Portable `.spriteproject` backup and transfer | Define archive, import, conflicts, migrations, and cross-host round trip |
| Added | Portable Electron Windows x64 host | Add secure preload APIs, project folders, direct export directory, and local recovery |
| Added | Host capability presentation | Make shared versus host-specific behavior explicit in UI and evidence |
| Retained | ADR-001 zero-server web baseline | Web remains complete and required; no backend is introduced |
| Added | ADR-002 dual-host product | Electron becomes an accepted optional host, not a replacement for web |
| Unaffected | Art pack content, semantic token definitions, frame geometry | No content or renderer expansion in UPD-001 |
| Unaffected | North Star terrain, structures, manual editing, maps | Remain outside this update |

## Affected Verified Flows

The following baseline flows require regression evidence because persistence, shell, or export delivery is touched:

- `TF-FIRST-PROJECT`
- `TF-COMPOSE`
- `TF-EDIT-COMPOSITION`
- `TF-THEME`
- `TF-PREVIEW`
- `TF-SAVE-REOPEN`
- `TF-EXPORT-GENERIC`
- `TF-EXPORT-GODOT`
- `TF-INSPECT-CREDITS`
- `TF-RECOVER`
- `TF-SECOND-PACK`
- `TF-KEYBOARD-JOURNEY`

The creative outputs may retain their baseline IDs and oracles when unchanged, but they do not inherit UPD-001 verification without host regression runs.

## Data and Migration Impact

- Existing localStorage project data must migrate once into IndexedDB without changing project ID, recipe, theme, preview state, or render hash.
- Migration creates a known-good snapshot before deleting or marking the legacy record migrated.
- The web repository gains multiple-project indexing, revisions, snapshots, and conflict handling.
- Electron project folders serialize the same canonical project document and pack lock used by archives.
- Browser-only keys, object URLs, filesystem paths, and Electron handles never enter canonical project data.
- Web and Electron use one canonical `.spriteproject` file profile with identical JSON normalization, entry paths,
	checksums, version negotiation, migration behavior, and host-metadata exclusions.
- The Electron project folder is the exploded canonical archive payload; `exports/` and `.sprite-cache/` remain
	outside portable data.
- Both hosts must open and save files produced by the other without host conversion. Independent serializers are
	acceptable only if compatibility fixtures prove identical canonical payload bytes.

## UX Impact

- Add project library as the entry surface when multiple projects exist.
- Add backup/import and storage status on web.
- Add portable desktop launch context, recent folders, Create Folder, Open Folder, Save, Save As, and direct export destination.
- Preserve the existing Compose, Theme, Preview, and Export workspaces.
- Expose host-specific actions only where available; do not show non-functional desktop controls on web.

## Security Impact

- Electron uses `contextIsolation: true`, `nodeIntegration: false`, a sandboxed renderer, narrow typed preload methods, path validation, and user-selected roots.
- Imported archives and packs remain untrusted input on both hosts.
- Desktop writes are atomic and constrained to the selected project/export location.
- No secrets or remote credentials are added.

## Operational Impact

- GitHub Pages remains the web distribution surface.
- Portable Electron ZIP artifacts may be attached to GitHub Releases; no update server is added.
- Unsigned Windows binaries can produce SmartScreen warnings and must be labeled accurately.
- Automated validation expands to browser, Electron, cross-host archive, project-folder, and output-parity runs.

## Supersession

`product/src/domain/storage.ts` is an implementation to replace, not a historical product decision. ADR-001 remains accepted. ADR-002 amends the host strategy by accepting Electron as an optional distribution based on explicit owner direction and future local-file expansion, while retaining the complete web baseline.
