# UPD-001 - Dual-Host Local-First MVP

## Request

Evolve the MVP into two complementary distributions:

1. A simple GitHub Pages web version that requires no server and uses localStorage and IndexedDB for basic local work.
2. A portable Electron version that runs locally, performs convenient local file operations, and establishes the host boundary for future desktop expansion.

## Source

Owner direction received 2026-07-19.

## Intended Outcome

A user can start immediately in a browser, retain and back up ordinary work locally, and move the same project into a portable desktop application when direct project-folder and export-folder operations are more convenient. Both hosts remain one product: shared domain rules, project schema, pack schema, rendering, provenance, and output contracts.

## Constraints

- GitHub Pages is the only required web host.
- No application server, database server, account service, or paid infrastructure may be required.
- Web project data remains on the user's device.
- localStorage is limited to small preferences and pointers; IndexedDB owns project records.
- Electron is portable rather than installer-dependent for this update.
- The first desktop distribution targets Windows x64 and may be unsigned.
- The Electron renderer does not receive unrestricted Node.js access.
- Browser and desktop project formats must round-trip without semantic drift.
- Existing verified creative and export flows remain regression obligations.

## Decision Authority

Product owner approves the product direction. Architecture details remain subject to ADR-001 and ADR-002. Verification status remains evidence-owned.

## Requested Status

`specified` after traceability, impact, architecture, and execution plans pass validation. Implementation is a subsequent stage and must not be inferred from specification approval.

## Binding Technical Sources

- `implementation-contract.md` owns project schema version 2, legacy migration, repository revisions, snapshot/quota policy, archive limits, conflict semantics, Electron bridge/path authority, error codes, accessibility, and distribution details.
- `quality-scenarios.md` owns measurable cross-cutting correctness, durability, security, compatibility, accessibility, capacity, performance, offline, release, and maintainability scenarios.
- The implementation contract resolves details inside the accepted promise. It does not expand the user-facing product boundary or change the rollback baseline.

## Amendment A · Same project file on both hosts

Owner clarification received 2026-07-19: files saved from web and Electron must be mutually compatible.

UPD-001 therefore requires one universal <code>.spriteproject</code> interchange format that both hosts open and
save directly. The Electron project folder is the exploded canonical archive payload plus non-portable output and
cache directories. This amendment does not add a new promise or rollout boundary; it makes the existing cross-host
portability promise implementation-grade and adds bidirectional re-save evidence.
