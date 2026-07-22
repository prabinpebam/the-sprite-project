# UPD-004 Customer Promise

**Update:** Multi-character projects (UPD-004)

**Status:** implemented

**Target user:** Solo and small-team 2D game developers maintaining a coherent cast

**Quality gate:** A developer can create, switch, independently edit, save, recover, transfer, and export multiple named characters in one local-first project without sibling or terrain drift

## CP-CHARACTER-COLLECTION - A developer can keep a named cast of characters in one project and deliberately choose which character is active.

- **Host:** shared
- **User:** Developer building a coherent cast
- **Context:** One project shares theme, packs, terrain, persistence, and backups
- **Trigger:** They create or open another character
- **Outcome:** The collection shows every named character and the active editing/export target
- **Quality:** Up to 16 characters remain responsive, named, accessible, and unambiguous
- **Recovery:** Invalid creation, rename, capacity, or deletion writes nothing and explains recovery
- **Evidence:** Actual web and packaged Electron collection flows
- **Status:** implemented

## CP-CHARACTER-ISOLATION - A developer can edit and save each character separately without changing sibling character recipes.

- **Host:** shared
- **User:** Developer iterating on several characters
- **Context:** Project contains two or more recipes
- **Trigger:** They compose, override, duplicate, rename, or delete one character
- **Outcome:** Only the intended recipe changes while one atomic project save preserves all recipes
- **Quality:** Sibling and terrain canonical bytes remain unchanged outside deliberate shared theme/preview edits
- **Recovery:** Snapshots, conflicts, and cancellation preserve last committed recipes
- **Evidence:** Negative hash, persistence, snapshot, and UI evidence
- **Status:** implemented

## CP-CHARACTER-PORTABILITY - A developer can reopen and transfer the complete character collection across web and Electron while exporting the active character explicitly.

- **Host:** cross-host
- **User:** Developer using browser and portable Windows hosts
- **Context:** Project has multiple characters and optional terrain
- **Trigger:** They save, back up, import, relaunch, or export
- **Outcome:** Names, order, active recipe, recipe bytes, terrain, and active export semantics survive
- **Quality:** Checksums and output hashes match across hosts and old readers fail before mutation
- **Recovery:** Malformed archives and stale writes produce no partial collection
- **Evidence:** Bidirectional actual-host archive and retained regression evidence
- **Status:** implemented
