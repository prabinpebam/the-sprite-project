# UPD-003 Scenarios

| ID | Host | Promises | Actor | Intent | Success | Status |
|---|---|---|---|---|---|---|
| SC-TERRAIN-FIRST | shared | `CP-TERRAIN-CREATE`, `CP-TERRAIN-PROJECT` | Developer starting a map | Create useful ground tiles quickly | A default grass terrain exists with all masks and a painted preview | implemented |
| SC-TERRAIN-PAINT | shared | `CP-TERRAIN-CREATE` | Developer evaluating autotiling | Paint a small map and see correct edges | Painting recomputes neighboring masks and visible pixels deterministically | implemented |
| SC-TERRAIN-THEME | shared | `CP-TERRAIN-CREATE`, `CP-TERRAIN-PROJECT` | Developer matching terrain to a character | Change ground mood coherently | Terrain colors derive from project theme then allow terrain-local overrides without changing character tokens | implemented |
| SC-TERRAIN-RETURN | web | `CP-TERRAIN-PROJECT` | Returning browser user | Continue exact terrain work | Map, material, palette, atlas hash, and character hash reopen unchanged | implemented |
| SC-TERRAIN-DESKTOP | desktop | `CP-TERRAIN-PROJECT`, `CP-TERRAIN-DELIVERY` | Portable Windows user | Continue and export through native locations | Terrain opens, saves atomically, and exports without renderer filesystem authority | implemented |
| SC-TERRAIN-EXPORT | shared | `CP-TERRAIN-DELIVERY` | Developer preparing engine assets | Export complete terrain output | Package contains atlas PNG, cardinal-mask manifest, credits, and optional Godot terrain resource | implemented |
| SC-TERRAIN-CROSS-HOST | cross-host | `CP-TERRAIN-PROJECT`, `CP-TERRAIN-DELIVERY` | Developer using both hosts | Continue on the other host | Project and exports round trip with identical terrain and character hashes | implemented |
| SC-TERRAIN-COMPATIBILITY | shared | `CP-TERRAIN-PROJECT` | Existing MVP user | Upgrade without drift | Character-only bytes, behavior, exports, packs, and credits remain unchanged | implemented |

## SC-TERRAIN-FIRST

- **Starting state:** Character project has no terrain document
- **Environment:** Web or packaged Electron
- **Interruptions:** Cancel creation; Storage failure; Reduced motion

## SC-TERRAIN-PAINT

- **Starting state:** Terrain document exists
- **Environment:** Pointer or keyboard accessible grid
- **Interruptions:** Erase tile; Fill map; Undo reset

## SC-TERRAIN-THEME

- **Starting state:** Terrain and character share a project
- **Environment:** Terrain palette controls
- **Interruptions:** Invalid hex; Reset override; Preset change

## SC-TERRAIN-RETURN

- **Starting state:** Saved project contains terrain
- **Environment:** IndexedDB and offline restart
- **Interruptions:** Stale tab; Quota pressure; Snapshot restore

## SC-TERRAIN-DESKTOP

- **Starting state:** Project folder or archive contains terrain
- **Environment:** Packaged Electron with opaque grants
- **Interruptions:** External modification; Permission failure; Unsaved close

## SC-TERRAIN-EXPORT

- **Starting state:** Terrain document is valid
- **Environment:** Generic or Godot export
- **Interruptions:** Incomplete palette; PNG encode failure; Destination failure

## SC-TERRAIN-CROSS-HOST

- **Starting state:** One host saved a terrain project
- **Environment:** .spriteproject archive v3
- **Interruptions:** Older host; Archive tamper; Import conflict

## SC-TERRAIN-COMPATIBILITY

- **Starting state:** Character-only v1/v2 archive or project exists
- **Environment:** Updated web or Electron host
- **Interruptions:** Legacy migration; Rollback reader; Future terrain schema
