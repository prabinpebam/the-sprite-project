# UPD-004 Release Gate

UPD-004 requires 100% traceability, implemented records, six changed task flows, 25 expected behaviors, domain/persistence/archive tests, actual web and packaged Electron flows, bidirectional cross-host evidence, all affected MVP/UPD-001/UPD-002/UPD-003 regressions, zero unresolved severity 0–2 issues, and zero unexplained console/page/network/filesystem/IPC anomalies.

Specific gates:

- Existing one-character projects open unchanged.
- 16 characters save/reopen within two seconds; the 17th is blocked before mutation.
- Editing/renaming/deleting one recipe preserves sibling and terrain hashes except where shared theme/preview is intentionally changed.
- Removed recipe records/files are absent after successful save and recoverable from snapshot.
- Old single-character readers reject multi-character graphs before mutation.
- Existing Electron bridge remains exactly 18 frozen methods.
- Character export visibly targets active character only; terrain export is unchanged.
- Rollback preserves every recipe entry.
- Canonical sibling-recipe and terrain hashes are compared before/after every collection operation, including failure paths.

Actual GitHub Pages publication and independent clean-machine Windows observation remain inherited external release gates and prevent a global `verified` claim when absent.