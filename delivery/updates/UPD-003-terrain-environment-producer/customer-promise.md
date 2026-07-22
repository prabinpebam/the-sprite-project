# UPD-003 Customer Promise

**Update:** Terrain Environment Producer (UPD-003)

**Baseline:** 24bcd44efc0d41a83b85674f1570bbd1bca12935 / RUN-UPD002-001

**Status:** implemented

**Target user:** Solo and small-team 2D game developers who need coherent 32px ground tiles alongside their existing character work

**Objective quality gate:** A developer can create, paint, theme, save, transfer, and export a deterministic cardinal terrain tileset from the same local-first project without changing existing character semantics or requiring a server

## CP-TERRAIN-CREATE - A developer can create a coherent 32px terrain tileset without drawing every edge and corner manually.

- **Host:** shared
- **User:** Developer building a top-down 2D map
- **Context:** The project already contains or may later contain a character and shared visual theme
- **Trigger:** They open Terrain and choose a ground material
- **Outcome:** The product deterministically generates all sixteen cardinal-neighbor tiles and a live paintable map preview
- **Quality:** Every mask is present, seams are deterministic, previews update within one frame for ordinary maps, and identical documents produce identical pixels
- **Recovery:** Invalid or incomplete terrain state remains editable, names exact blockers, and never corrupts the character recipe
- **Evidence:** Pure mask/render fixtures plus actual-UI creation, painting, theming, and recovery flows pass on web and packaged Electron
- **Status:** implemented

## CP-TERRAIN-PROJECT - A developer can keep terrain and character work in one local-first project while each producer retains its own versioned document.

- **Host:** shared
- **User:** Returning developer alternating between character and terrain work
- **Context:** One project may contain a verified character recipe and one optional terrain document
- **Trigger:** They save, reopen, snapshot, copy, import, or recover the project
- **Outcome:** Both producers preserve exact semantic state and use one project identity, revision, storage lifecycle, and portable backup
- **Quality:** Character-only project bytes and render/export hashes remain unchanged; terrain transactions use the existing optimistic revision and recovery model
- **Recovery:** Old readers reject terrain archives before mutation; conflicts, invalid documents, and interrupted writes preserve the last committed graph
- **Evidence:** Repository, archive-v3, migration, conflict, snapshot, copy, offline, and regression fixtures pass
- **Status:** implemented

## CP-TERRAIN-DELIVERY - A developer can move and export terrain between web and Electron and use it in Godot without manual tile slicing or rule reconstruction.

- **Host:** cross-host
- **User:** Developer shipping a Godot tilemap from either host
- **Context:** A project contains a valid terrain document
- **Trigger:** They export generic or Godot terrain output or transfer a project backup
- **Outcome:** Both hosts emit identical atlas pixels, mask metadata, terrain credits, and Godot TileSet resource inputs
- **Quality:** Archive, atlas, manifest, credits, and Godot metadata hashes match across hosts; output stays offline-capable
- **Recovery:** Blocked export names exact terrain issues and produces no partial package; archive conflicts preserve both project versions
- **Evidence:** Actual web-to-Electron-to-web project round trip and generic/Godot artifact inspection pass
- **Status:** implemented
