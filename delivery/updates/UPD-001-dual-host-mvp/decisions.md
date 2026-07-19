# UPD-001 Decisions

## DEC-UPD001-DUAL-HOST

- **Decision:** Keep GitHub Pages as the complete required web host and add portable Electron as an optional local-file host over one shared product core.
- **Decision state:** locked
- **Locked at:** 2026-07-19
- **Locked by:** product owner
- **Change criteria:** Reopen only if accepted product direction changes or measured host lifecycle, security, or adoption evidence shows the shared dual-host model no longer has positive net value.
- **Reversible:** Yes
- **Evidence:** Owner direction and ADR-002; implementation evidence pending. Implemented and locally evidenced by RUN-UPD001-001; external release gates remain.
- **Status:** implemented

## DEC-UPD001-WEB-STORAGE

- **Decision:** Use IndexedDB for project records and snapshots and localStorage only for small preferences, pointers, and migration markers.
- **Decision state:** locked
- **Locked at:** 2026-07-19
- **Locked by:** product owner
- **Change criteria:** Reopen only from demonstrated browser-storage infeasibility, data-loss risk, or a changed product/backend constraint whose benefit exceeds migration and revalidation cost.
- **Reversible:** Yes
- **Evidence:** ADR-001 storage contract; migration and actual-UI evidence pending. Implemented and locally evidenced by RUN-UPD001-001; external release gates remain.
- **Status:** implemented

## DEC-UPD001-PORTABLE-WINDOWS

- **Decision:** Distribute the first Electron host as a portable Windows x64 ZIP through GitHub Releases without installer or automatic updates.
- **Decision state:** locked
- **Locked at:** 2026-07-19
- **Locked by:** product owner
- **Change criteria:** Reopen only from changed funding/platform support or measured distribution friction that justifies signing, installer, auto-update, or another desktop host after full lifecycle cost analysis.
- **Reversible:** Yes
- **Evidence:** Zero-server and zero-signing-cost constraints; packaged validation pending. Implemented and locally evidenced by RUN-UPD001-001; external release gates remain.
- **Status:** implemented

## DEC-UPD001-SHARED-SCHEMA

- **Decision:** Canonical project schema version 2, recipe schema version 1, pack, provenance, archive, and export schemas remain host-neutral; host-only state is stored separately. Version 1 projects migrate deterministically and writers emit version 2 only.
- **Decision state:** locked
- **Locked at:** 2026-07-19
- **Locked by:** product owner
- **Change criteria:** Reopen only for a proven contract defect, incompatible accepted requirement, or migration evidence showing schema version 2 cannot preserve baseline and cross-host invariants.
- **Reversible:** No
- **Evidence:** Required to satisfy cross-host portability promise; parity evidence pending. Implemented and locally evidenced by RUN-UPD001-001; external release gates remain.
- **Status:** implemented

## DEC-UPD001-OPAQUE-FILE-GRANTS

- **Decision:** Electron renderer file operations use opaque, session-scoped grants minted by native dialogs or validated recent-project records; renderer-visible paths are display-only and never filesystem authority.
- **Decision state:** locked
- **Locked at:** 2026-07-19
- **Locked by:** product owner
- **Change criteria:** Reopen only from verified platform infeasibility or security evidence; an alternative IPC naming or path API without material net benefit is insufficient.
- **Reversible:** Yes
- **Evidence:** Minimizes the Electron trust boundary while preserving user-approved folder and export workflows; bridge and adversarial evidence pending. Implemented and locally evidenced by RUN-UPD001-001; external release gates remain.
- **Status:** implemented

## DEC-UPD001-OPTIMISTIC-REVISIONS

- **Decision:** Web saves use non-negative integer revisions checked inside one IndexedDB transaction; desktop saves compare canonical entry fingerprints. Mismatches write nothing and require explicit reload, overwrite with recovery, Save As or copy, or cancel.
- **Decision state:** locked
- **Locked at:** 2026-07-19
- **Locked by:** product owner
- **Change criteria:** Reopen only if concurrency fixtures falsify correctness or a changed collaboration promise requires stronger merge semantics whose benefit exceeds compatibility and complexity cost.
- **Reversible:** Yes
- **Evidence:** Prevents older tabs and externally modified folders from silently overwriting newer work; conflict-flow evidence pending. Implemented and locally evidenced by RUN-UPD001-001; external release gates remain.
- **Status:** implemented

## DEC-UPD001-SPEC-LOCK

- **Decision:** Lock the implementation-ready UPD-001 scope, decisions, behavior, architecture, compatibility, quality scenarios, and release gates at LOCK-UPD-001-002. Subsequent reviews are delta-only and equivalent alternatives do not justify change.
- **Decision state:** locked
- **Locked at:** 2026-07-19
- **Locked by:** product owner
- **Change criteria:** Reopen only through the product-engineering-spec-review justified-change protocol with eligible new evidence or changed constraints, positive net value after full change cost, product-vision alignment, bounded blast radius, revalidation funding, and owner approval.
- **Reversible:** Yes
- **Evidence:** REVIEW-UPD-001-001 passed two unfamiliar-implementer rounds. LOCK-UPD-001-001 was preserved and superseded by CHANGE-UPD001-LOCK-HARDENING-001, approved by APPROVAL-UPD-001-LOCK-002. Implemented and locally evidenced by RUN-UPD001-001; external release gates remain.
- **Status:** implemented
