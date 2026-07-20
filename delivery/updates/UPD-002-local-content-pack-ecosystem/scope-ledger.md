# UPD-002 Scope Ledger

## Positive Scope

| Type | Count |
|---|---|
| Customer promises | 4 |
| Scenarios | 12 |
| User-can capabilities | 24 |
| Task flows | 11 |
| Expected behaviors | 40 |

## Deliberate Exclusions

| ID | Expectation | Reason | Consequence | Disposition |
|---|---|---|---|---|
| OUT-UPD002-TERRAIN | Generate terrain or add a second producer | The delivery roadmap opens the pack ecosystem in Phase 4 before using it for the Phase 5 terrain producer | UPD-002 proves extensibility only with current-profile humanoid content | Phase 5 terrain update after pack ecosystem evidence |
| OUT-UPD002-SCENES | Compose characters and world assets in scenes | Scene value and schema depend on at least two real producers | Projects continue to expose one active character recipe | Phase 5 after terrain producer is specified |
| OUT-UPD002-NON-HUMANOID | Author creatures, mounts, animals, or rider composites | Distinct frame geometry, slots, masks, and z-order would make the pack profile ambiguous | Subject profile is fixed to current LPC humanoid 64px sheets | Later content ecosystem update from real non-humanoid fixtures |
| OUT-UPD002-PIXEL-EDITOR | Draw or edit source pixels in the product | Pack authoring configures compatible existing art; pixel/animation editing is a separate Phase 6 promise | Users edit source PNGs in an external art tool and reimport | Phase 6 manual editor |
| OUT-UPD002-ARBITRARY-GEOMETRY | Define custom frame sizes, layouts, directions, or animations | The next increment must prove the ecosystem without redesigning renderer geometry | Assets use exact 256x512 current humanoid idle/walk layout | Versioned future pack profile after a real second geometry |
| OUT-UPD002-FOLDER-WATCH | Watch arbitrary source or pack folders for live changes | Watcher lifecycle and path trust are independent desktop-only concerns | Authors explicitly reimport changed PNGs and re-export packs | Future desktop live-content update |
| OUT-UPD002-MARKETPLACE | Browse, download, publish, rate, moderate, or sell packs through a hosted catalog | Marketplace requires backend, identity, moderation, legal, and operating commitments | Users exchange local .spritepack files themselves | Separate funded backend update |
| OUT-UPD002-REMOTE-INSTALL | Install a pack directly from a URL | Remote retrieval adds network trust, availability, and privacy boundaries not needed for local ecosystem proof | Users download a pack first and install the local file | Future distribution update after local evidence |
| OUT-UPD002-EXECUTABLE-PACKS | Run pack scripts, plugins, shaders, SVG, or custom decoders | Executable content would violate the data-only local trust boundary | Pack entries are strict JSON, PNG, and UTF-8 text only | Permanently rejected for format version 1 |
| OUT-UPD002-ENGINE-ADAPTER | Add Unity, GameMaker, RPG Maker, or another engine adapter | An engine adapter has an independent user promise, implementation, evidence fixture, release, and rollback boundary | Generic and Godot exports remain the supported adapters | Candidate UPD-003 after adapter demand and target are selected |
| OUT-UPD002-CUSTOM-LICENSE | Enter arbitrary custom license terms or receive legal clearance | Unbounded terms cannot be validated or converted into deterministic attribution rules | Authoring supports an explicit curated license vocabulary and states that the product does not provide legal advice | Expand only through reviewed license profiles |
| OUT-UPD002-BULK-CONVERSION | Automatically convert existing third-party repositories into packs | Source layouts and licenses require deliberate human mapping and review | Authors import and configure assets individually or from a bounded draft | Future CLI after authoring contract is verified |

Anything plausible for the local content ecosystem but absent from both sections is a specification defect.
