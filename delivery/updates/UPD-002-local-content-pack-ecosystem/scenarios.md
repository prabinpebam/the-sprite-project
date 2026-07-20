# UPD-002 User Scenarios

| ID | Host | Promises | Actor | Intent | Success |
|---|---|---|---|---|---|
| SC-PACK-FIRST-INSTALL | shared | `CP-PACK-INSTALL` | Developer adding a themed wardrobe | Inspect and install a compatible local pack | The exact pack is installed, offline-ready, and available to new recipes |
| SC-PACK-INVALID | shared | `CP-PACK-INSTALL`, `CP-PACK-LIFECYCLE` | Developer receiving an untrusted pack | Understand why a pack cannot be installed | The package is rejected with a stable code and no repository or project mutation |
| SC-PACK-LIBRARY | shared | `CP-PACK-LIFECYCLE` | Returning developer | Inspect availability, origin, storage, usage, and status | The library accurately distinguishes bundled, installed, embedded, disabled, missing, and in-use versions |
| SC-PACK-UPDATE | shared | `CP-PACK-LIFECYCLE` | Developer evaluating a newer pack version | Install the new version without changing existing projects | Versions coexist and only explicit project action changes a lock after preview and checkpoint |
| SC-PACK-REMOVE | shared | `CP-PACK-LIFECYCLE` | Developer reclaiming local storage | Remove only content that is safe to remove | Unused versions remove after confirmation; referenced versions remain intact with affected projects named |
| SC-PACK-MISSING-RECOVERY | shared | `CP-PACK-LIFECYCLE`, `CP-PACK-PORTABILITY` | Developer opening a transferred project | Recover deterministic rendering without losing the project | Installing or locating the exact checksum resumes the project; replacement creates a copy and preserves the original lock |
| SC-PACK-AUTHOR-START | shared | `CP-PACK-AUTHOR` | Technical artist with original compatible art | Define pack identity and add humanoid layer sheets | A draft contains valid metadata and at least one decoded, classified asset |
| SC-PACK-AUTHOR-TOKENS | shared | `CP-PACK-AUTHOR` | Technical artist making art theme-aware | Bind source colors to semantic tokens while preserving fixed colors | Every source color has an explicit fixed or token+shade disposition and preview matches exported runtime pixels |
| SC-PACK-AUTHOR-PROVENANCE | shared | `CP-PACK-AUTHOR` | Creator preparing redistribution | Record exact source, author, offered license, chosen license, and attribution text | Validation proves every asset has supported, internally consistent provenance and generated credits |
| SC-PACK-AUTHOR-RECOVERY | shared | `CP-PACK-AUTHOR` | Returning pack author | Resume without reimporting source art | The latest committed draft and imported bytes reopen, validation state recomputes, and recovery export is available |
| SC-PACK-CROSS-HOST | cross-host | `CP-PACK-PORTABILITY` | Developer alternating between hosts | Continue on the other host | Pack bytes, project locks, preview hashes, generic/Godot exports, and credits remain identical |
| SC-PACK-EMBEDDED-OFFLINE | cross-host | `CP-PACK-PORTABILITY`, `CP-PACK-LIFECYCLE` | Developer receiving a project without a separately installed pack | Open and use the project without globally installing embedded content | Embedded exact locks validate project-scoped, preview/save/archive/generic/Godot/credits complete, and no global pack or enabled-state mutation occurs |

## SC-PACK-FIRST-INSTALL

- **Host:** shared
- **Promises:** `CP-PACK-INSTALL`
- **Actor:** Developer adding a themed wardrobe
- **Starting state:** Pack library contains bundled packs only
- **Intent:** Inspect and install a compatible local pack
- **Environment:** Supported web or packaged Electron host
- **Success:** The exact pack is installed, offline-ready, and available to new recipes
- **Interruptions:** Cancel before commit; Duplicate version; Quota or disk capacity; Host closes during validation
- **Status:** specified

## SC-PACK-INVALID

- **Host:** shared
- **Promises:** `CP-PACK-INSTALL`, `CP-PACK-LIFECYCLE`
- **Actor:** Developer receiving an untrusted pack
- **Starting state:** Existing projects and packs are valid
- **Intent:** Understand why a pack cannot be installed
- **Environment:** Malformed, hostile, unsupported, or oversized .spritepack fixture
- **Success:** The package is rejected with a stable code and no repository or project mutation
- **Interruptions:** Traversal; Checksum mismatch; Malformed PNG; Future schema; Unknown license; Compression bomb
- **Status:** specified

## SC-PACK-LIBRARY

- **Host:** shared
- **Promises:** `CP-PACK-LIFECYCLE`
- **Actor:** Returning developer
- **Starting state:** Bundled and locally installed pack versions exist
- **Intent:** Inspect availability, origin, storage, usage, and status
- **Environment:** Online or offline
- **Success:** The library accurately distinguishes bundled, installed, embedded, disabled, missing, and in-use versions
- **Interruptions:** Unavailable source; Corrupt local record; Storage estimate unavailable
- **Status:** specified

## SC-PACK-UPDATE

- **Host:** shared
- **Promises:** `CP-PACK-LIFECYCLE`
- **Actor:** Developer evaluating a newer pack version
- **Starting state:** Projects lock version 1 and a valid version 2 package is available locally
- **Intent:** Install the new version without changing existing projects
- **Environment:** Both hosts
- **Success:** Versions coexist and only explicit project action changes a lock after preview and checkpoint
- **Interruptions:** Same version different checksum; Breaking asset removal; Update cancelled
- **Status:** specified

## SC-PACK-REMOVE

- **Host:** shared
- **Promises:** `CP-PACK-LIFECYCLE`
- **Actor:** Developer reclaiming local storage
- **Starting state:** An installed pack may be unused or referenced
- **Intent:** Remove only content that is safe to remove
- **Environment:** Pack library
- **Success:** Unused versions remove after confirmation; referenced versions remain intact with affected projects named
- **Interruptions:** Removal cancelled; Pack becomes referenced concurrently; Filesystem or IndexedDB failure
- **Status:** specified

## SC-PACK-MISSING-RECOVERY

- **Host:** shared
- **Promises:** `CP-PACK-LIFECYCLE`, `CP-PACK-PORTABILITY`
- **Actor:** Developer opening a transferred project
- **Starting state:** Project requires an unavailable exact pack lock
- **Intent:** Recover deterministic rendering without losing the project
- **Environment:** Web or Electron
- **Success:** Installing or locating the exact checksum resumes the project; replacement creates a copy and preserves the original lock
- **Interruptions:** Wrong version; Right ID/version but wrong checksum; User cancels
- **Status:** specified

## SC-PACK-AUTHOR-START

- **Host:** shared
- **Promises:** `CP-PACK-AUTHOR`
- **Actor:** Technical artist with original compatible art
- **Starting state:** No draft or a blank draft
- **Intent:** Define pack identity and add humanoid layer sheets
- **Environment:** Pack authoring workspace
- **Success:** A draft contains valid metadata and at least one decoded, classified asset
- **Interruptions:** Invalid dimensions; Non-PNG input; Duplicate asset ID; User cancels
- **Status:** specified

## SC-PACK-AUTHOR-TOKENS

- **Host:** shared
- **Promises:** `CP-PACK-AUTHOR`
- **Actor:** Technical artist making art theme-aware
- **Starting state:** A valid asset sheet is present
- **Intent:** Bind source colors to semantic tokens while preserving fixed colors
- **Environment:** Token mapping and runtime preview
- **Success:** Every source color has an explicit fixed or token+shade disposition and preview matches exported runtime pixels
- **Interruptions:** Ambiguous anti-aliased color; Unmapped color; Invalid shade; Preview decode failure
- **Status:** specified

## SC-PACK-AUTHOR-PROVENANCE

- **Host:** shared
- **Promises:** `CP-PACK-AUTHOR`
- **Actor:** Creator preparing redistribution
- **Starting state:** Assets are configured but legal metadata may be incomplete
- **Intent:** Record exact source, author, offered license, chosen license, and attribution text
- **Environment:** Pack authoring workspace
- **Success:** Validation proves every asset has supported, internally consistent provenance and generated credits
- **Interruptions:** Unsupported license; Missing source URL; Chosen license not offered; Attribution omitted
- **Status:** specified

## SC-PACK-AUTHOR-RECOVERY

- **Host:** shared
- **Promises:** `CP-PACK-AUTHOR`
- **Actor:** Returning pack author
- **Starting state:** A dirty or previously failed draft exists
- **Intent:** Resume without reimporting source art
- **Environment:** Browser restart or Electron relaunch
- **Success:** The latest committed draft and imported bytes reopen, validation state recomputes, and recovery export is available
- **Interruptions:** Quota full; Interrupted asset write; Unsupported future draft
- **Status:** specified

## SC-PACK-CROSS-HOST

- **Host:** cross-host
- **Promises:** `CP-PACK-PORTABILITY`
- **Actor:** Developer alternating between hosts
- **Starting state:** One host authored a pack and project using it
- **Intent:** Continue on the other host
- **Environment:** Local .spritepack and .spriteproject transfer
- **Success:** Pack bytes, project locks, preview hashes, generic/Godot exports, and credits remain identical
- **Interruptions:** Pack already installed; Pack missing; Checksum conflict; Archive cancelled
- **Status:** specified

## SC-PACK-EMBEDDED-OFFLINE

- **Host:** cross-host
- **Promises:** `CP-PACK-PORTABILITY`, `CP-PACK-LIFECYCLE`
- **Actor:** Developer receiving a project without a separately installed pack
- **Starting state:** Project archive v2 embeds every non-bundled exact pack and destination is offline
- **Intent:** Open and use the project without globally installing embedded content
- **Environment:** Disconnected supported web or packaged Electron host
- **Success:** Embedded exact locks validate project-scoped, preview/save/archive/generic/Godot/credits complete, and no global pack or enabled-state mutation occurs
- **Interruptions:** Corrupt embedded package; Lock/checksum mismatch; Exact global package already installed; User cancels
- **Status:** specified
