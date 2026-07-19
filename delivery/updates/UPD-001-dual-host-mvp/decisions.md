# UPD-001 Decisions

## DEC-UPD001-DUAL-HOST

- **Decision:** Keep GitHub Pages as the complete required web host and add portable Electron as an optional local-file host over one shared product core.
- **Reversible:** Yes
- **Evidence:** Owner direction and ADR-002; implementation evidence pending.
- **Status:** specified

## DEC-UPD001-WEB-STORAGE

- **Decision:** Use IndexedDB for project records and snapshots and localStorage only for small preferences, pointers, and migration markers.
- **Reversible:** Yes
- **Evidence:** ADR-001 storage contract; migration and actual-UI evidence pending.
- **Status:** specified

## DEC-UPD001-PORTABLE-WINDOWS

- **Decision:** Distribute the first Electron host as a portable Windows x64 ZIP through GitHub Releases without installer or automatic updates.
- **Reversible:** Yes
- **Evidence:** Zero-server and zero-signing-cost constraints; packaged validation pending.
- **Status:** specified

## DEC-UPD001-SHARED-SCHEMA

- **Decision:** Canonical project, pack, provenance, and export schemas remain host-neutral; host-only state is stored separately.
- **Reversible:** No
- **Evidence:** Required to satisfy cross-host portability promise; parity evidence pending.
- **Status:** specified
