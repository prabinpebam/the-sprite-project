extends SceneTree

const NEIGHBORS := [
    TileSet.CELL_NEIGHBOR_TOP_SIDE,
    TileSet.CELL_NEIGHBOR_RIGHT_SIDE,
    TileSet.CELL_NEIGHBOR_BOTTOM_SIDE,
    TileSet.CELL_NEIGHBOR_LEFT_SIDE,
]

func _init() -> void:
    var image := Image.create(128, 128, false, Image.FORMAT_RGBA8)
    image.fill(Color("5b8c51"))
    if image.save_png("res://terrain-atlas.png") != OK:
        push_error("Could not write terrain atlas")
        quit(1)
        return

    var tile_set := TileSet.new()
    tile_set.tile_size = Vector2i(32, 32)
    tile_set.add_terrain_set(0)
    tile_set.set_terrain_set_mode(0, TileSet.TERRAIN_MODE_MATCH_SIDES)
    tile_set.add_terrain(0, 0)
    tile_set.set_terrain_name(0, 0, "Grass")

    var source := TileSetAtlasSource.new()
    source.texture = ImageTexture.create_from_image(image)
    source.texture_region_size = Vector2i(32, 32)
    for mask in range(16):
        var atlas_coords := Vector2i(mask % 4, mask / 4)
        source.create_tile(atlas_coords)
        var tile_data := source.get_tile_data(atlas_coords, 0)
        tile_data.terrain_set = 0
        tile_data.terrain = 0
        for bit in range(4):
            tile_data.set_terrain_peering_bit(NEIGHBORS[bit], 0 if mask & (1 << bit) else -1)

    tile_set.add_source(source, 0)
    var result := ResourceSaver.save(tile_set, "res://terrain_tileset.tres")
    if result != OK:
        push_error("Could not write terrain TileSet: %s" % result)
        quit(1)
        return

    print("TERRAIN_TILESET_FIXTURE_PASS sources=%s tiles=%s" % [tile_set.get_source_count(), source.get_tiles_count()])
    quit()