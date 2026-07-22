# UPD-003 Decisions

## DEC-UPD003-BOUNDARY

Add one built-in static terrain producer before structures, scenes, or expanded terrain packs. Reversible only through a future product update.

## DEC-UPD003-CARDINAL

Use a complete 16-tile cardinal profile with N=1, E=2, S=4, W=8 and 32px tiles. This is a compatibility contract and is not casually reversible.

## DEC-UPD003-GRAPH

Store terrain as optional `TerrainDocumentV1` in the project graph while preserving strict `project.json` schema version 2 and character recipe version 1.

## DEC-UPD003-ARCHIVE

Terrain projects use `.spriteproject` archive format 3 with `terrain.json`; character-only archives retain formats 1/2. Old readers fail closed.

## DEC-UPD003-PALETTE

Terrain stores four local colors derived explicitly from the active project theme. Existing character token fields remain byte-compatible.

## DEC-UPD003-BUILTIN

Ship Grass, Dirt, Sand, and Stone as deterministic procedural CC0 material definitions. Terrain pack install/authoring is deferred until terrain behavior is proven.

## Fixed Preview Rationale

The 12×8 occupancy map is a verification surface, not a level format: it demonstrates borders, corners, holes, and enclosed regions while staying bounded for persistence, accessibility, and performance. Arbitrary dimensions/import/export remain scene-stage work.
