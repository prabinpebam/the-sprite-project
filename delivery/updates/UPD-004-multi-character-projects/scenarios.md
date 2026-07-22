# UPD-004 Scenarios

| ID | Host | Promises | Actor | Intent | Success | Status |
|---|---|---|---|---|---|---|
| SC-CHARACTER-CREATE | shared | `CP-CHARACTER-COLLECTION`, `CP-CHARACTER-ISOLATION` | Developer adding an NPC | Create another safe character | Named default recipe is appended and active | implemented |
| SC-CHARACTER-SWITCH-EDIT | shared | `CP-CHARACTER-COLLECTION`, `CP-CHARACTER-ISOLATION` | Developer alternating cast members | Edit one without sibling drift | Active render/edit changes and sibling bytes do not | implemented |
| SC-CHARACTER-MANAGE | shared | `CP-CHARACTER-COLLECTION`, `CP-CHARACTER-ISOLATION` | Developer managing variants | Duplicate, rename, or remove a character | Identity/order/fallback are deterministic and recoverable | implemented |
| SC-CHARACTER-RETURN | web | `CP-CHARACTER-ISOLATION`, `CP-CHARACTER-PORTABILITY` | Returning browser user | Continue exact active character | All recipes and active ID restore exactly | implemented |
| SC-CHARACTER-DESKTOP | desktop | `CP-CHARACTER-ISOLATION`, `CP-CHARACTER-PORTABILITY` | Portable Windows user | Edit and save collection | Canonical recipe files match graph and stale files are removed | implemented |
| SC-CHARACTER-CROSS-HOST | cross-host | `CP-CHARACTER-PORTABILITY` | Developer changing hosts | Round-trip complete project | Every recipe/terrain hash and active export matches | implemented |

## SC-CHARACTER-CREATE

- **Starting state:** Project has one character
- **Environment:** Web or Electron
- **Interruptions:** Duplicate name; Capacity reached; Cancel

## SC-CHARACTER-SWITCH-EDIT

- **Starting state:** Two characters differ
- **Environment:** Compose, Theme, Preview
- **Interruptions:** Missing pack; Unsaved switch; Invalid override

## SC-CHARACTER-MANAGE

- **Starting state:** Collection has multiple characters
- **Environment:** Project collection
- **Interruptions:** Duplicate name; Delete active; Delete sole; Cancel

## SC-CHARACTER-RETURN

- **Starting state:** Saved collection and terrain exist
- **Environment:** IndexedDB/offline
- **Interruptions:** Stale tab; Quota; Snapshot restore

## SC-CHARACTER-DESKTOP

- **Starting state:** Folder project has multiple recipe files
- **Environment:** Packaged Electron
- **Interruptions:** External edit; Permission failure; Unsaved close

## SC-CHARACTER-CROSS-HOST

- **Starting state:** Three-character project with terrain
- **Environment:** .spriteproject
- **Interruptions:** Old reader; Tamper; Import conflict
