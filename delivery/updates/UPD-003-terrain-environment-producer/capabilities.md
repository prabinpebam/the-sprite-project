# UPD-003 User-Can Catalog

| ID | Host | User can statement | Scenarios | Status |
|---|---|---|---|---|
| UC-TERRAIN-CREATE | shared | User can add one terrain document to an existing project. | `SC-TERRAIN-FIRST` | implemented |
| UC-TERRAIN-REMOVE | shared | User can remove terrain after explicit confirmation without deleting the character recipe. | `SC-TERRAIN-FIRST` | implemented |
| UC-TERRAIN-CHOOSE-MATERIAL | shared | User can choose grass, dirt, sand, or stone as the generated material. | `SC-TERRAIN-FIRST`, `SC-TERRAIN-THEME` | implemented |
| UC-TERRAIN-SEE-TILES | shared | User can inspect all sixteen cardinal-neighbor autotile variants and their mask IDs. | `SC-TERRAIN-FIRST`, `SC-TERRAIN-PAINT` | implemented |
| UC-TERRAIN-PAINT | shared | User can paint and erase cells on a fixed 12 by 8 test map. | `SC-TERRAIN-PAINT` | implemented |
| UC-TERRAIN-FILL | shared | User can fill or clear the complete test map. | `SC-TERRAIN-PAINT` | implemented |
| UC-TERRAIN-RECOLOR | shared | User can edit terrain surface, detail, edge, and shadow colors. | `SC-TERRAIN-THEME` | implemented |
| UC-TERRAIN-RESET-THEME | shared | User can reset terrain colors to values derived from the active project theme. | `SC-TERRAIN-THEME` | implemented |
| UC-TERRAIN-SEE-READINESS | shared | User can see exact terrain persistence and export blockers. | `SC-TERRAIN-FIRST`, `SC-TERRAIN-EXPORT` | implemented |
| UC-TERRAIN-SAVE | shared | User can save terrain with the same project revision and snapshot lifecycle. | `SC-TERRAIN-RETURN`, `SC-TERRAIN-DESKTOP` | implemented |
| UC-TERRAIN-REOPEN | shared | User can reopen the exact terrain map and atlas pixels. | `SC-TERRAIN-RETURN`, `SC-TERRAIN-DESKTOP`, `SC-TERRAIN-COMPATIBILITY` | implemented |
| UC-TERRAIN-RECOVER | shared | User can recover terrain through project snapshots, copies, and archive conflict choices. | `SC-TERRAIN-RETURN`, `SC-TERRAIN-CROSS-HOST` | implemented |
| UC-TERRAIN-EXPORT-GENERIC | shared | User can download a generic terrain package with atlas, mask metadata, and credits. | `SC-TERRAIN-EXPORT` | implemented |
| UC-TERRAIN-EXPORT-GODOT | shared | User can download Godot terrain metadata without manual tile slicing. | `SC-TERRAIN-EXPORT` | implemented |
| UC-TERRAIN-EXPORT-DIRECT | desktop | User can write terrain outputs directly to an approved desktop export folder. | `SC-TERRAIN-DESKTOP` | implemented |
| UC-TERRAIN-TRANSFER | cross-host | User can transfer terrain in a versioned portable project archive. | `SC-TERRAIN-CROSS-HOST` | implemented |
| UC-TERRAIN-WORK-OFFLINE | web | User can paint, save, reopen, and export terrain offline after one complete load. | `SC-TERRAIN-RETURN` | implemented |
