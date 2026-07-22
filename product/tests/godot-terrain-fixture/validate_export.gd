extends SceneTree

const NEIGHBORS := [
    TileSet.CELL_NEIGHBOR_TOP_SIDE,
    TileSet.CELL_NEIGHBOR_RIGHT_SIDE,
    TileSet.CELL_NEIGHBOR_BOTTOM_SIDE,
    TileSet.CELL_NEIGHBOR_LEFT_SIDE,
]

func fail(message: String) -> void:
    push_error(message)
    quit(1)

func _init() -> void:
    var tile_set := load("res://terrain_tileset.tres") as TileSet
    if tile_set == null:
        fail("terrain_tileset.tres did not load")
        return
    if tile_set.tile_size != Vector2i(32, 32) or tile_set.get_source_count() != 1 or not tile_set.has_source(0):
        fail("TileSet dimensions or source inventory are invalid")
        return
    if tile_set.get_terrain_sets_count() != 1 or tile_set.get_terrains_count(0) != 1 or tile_set.get_terrain_set_mode(0) != TileSet.TERRAIN_MODE_MATCH_SIDES:
        fail("Terrain set contract is invalid")
        return

    var source := tile_set.get_source(0) as TileSetAtlasSource
    if source == null or source.texture_region_size != Vector2i(32, 32) or source.get_tiles_count() != 16:
        fail("Atlas source contract is invalid")
        return
    for mask in [0, 1, 3, 5, 10, 15]:
        var coords := Vector2i(mask % 4, mask / 4)
        if not source.has_tile(coords):
            fail("Missing atlas coordinates for mask %s" % mask)
            return
        var data := source.get_tile_data(coords, 0)
        for bit in range(4):
            var expected := 0 if mask & (1 << bit) else -1
            if data.get_terrain_peering_bit(NEIGHBORS[bit]) != expected:
                fail("Peering mismatch for mask %s bit %s" % [mask, bit])
                return

    print("GODOT_TERRAIN_VALIDATION_PASS sources=1 tiles=16 masks=0,1,3,5,10,15")
    quit()