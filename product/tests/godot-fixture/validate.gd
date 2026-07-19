extends SceneTree

const EXPECTED := {
    "idle_south": 1,
    "idle_west": 1,
    "idle_east": 1,
    "idle_north": 1,
    "walk_south": 4,
    "walk_west": 4,
    "walk_east": 4,
    "walk_north": 4,
}

func fail(message: String) -> void:
    push_error(message)
    quit(1)

func _initialize() -> void:
    call_deferred("validate_export")

func validate_export() -> void:
    var frames := load("res://character_sprite_frames.tres") as SpriteFrames
    if frames == null:
        fail("Generated SpriteFrames resource could not be loaded.")
        return

    for animation_name in EXPECTED:
        var animation := StringName(animation_name)
        if not frames.has_animation(animation):
            fail("Missing animation: %s" % animation_name)
            return
        if frames.get_frame_count(animation) != EXPECTED[animation_name]:
            fail("Wrong frame count for %s" % animation_name)
            return
        if not frames.get_animation_loop(animation):
            fail("Animation must loop: %s" % animation_name)
            return

    var texture := frames.get_frame_texture(&"walk_south", 3) as AtlasTexture
    if texture == null:
        fail("walk_south frame 3 is not an AtlasTexture.")
        return
    if texture.region != Rect2(192, 256, 64, 64):
        fail("Unexpected walk_south frame 3 region: %s" % texture.region)
        return
    if texture.atlas == null or texture.atlas.get_size() != Vector2(256, 512):
        fail("Spritesheet texture is not 256x512.")
        return
    if abs(frames.get_frame_duration(&"walk_south", 0) - 0.18) > 0.001:
        fail("walk_south duration is not 0.18 seconds.")
        return

    print("GODOT_VALIDATION_PASS animations=8 walk_frames=4 texture=256x512 region=192,256,64,64")
    quit(0)
