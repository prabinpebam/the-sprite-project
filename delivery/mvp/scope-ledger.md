# MVP Scope Ledger

## Included

| Type | Count | Canonical source |
|---|---|---|
| Customer promises | 5 | traceability.json / customer-promise.md |
| Scenarios | 10 | traceability.json / scenarios.md |
| User-can capabilities | 25 | traceability.json / capabilities.md |
| Task flows | 12 | traceability.json / task-flows.md |
| Expected behaviors | 37 | traceability.json / experience-architecture.md |

## Deliberately Excluded

| ID | Expectation | Reason | Consequence | Disposition |
|---|---|---|---|---|
| OUT-TERRAIN | Generate terrain and autotiles | Reasonable for the North Star studio but not required to prove the complete character-to-engine promise | MVP projects contain characters only | Phase 5 second producer |
| OUT-STRUCTURES | Generate buildings, structures, and props | Requires a distinct producer and perspective constraints unrelated to the first character journey | No scene furnishing in MVP | Phase 5 after terrain |
| OUT-SCENE | Compose full scenes | One character does not need a scene graph to reach Godot | Preview is character-only | Phase 5 when multiple producers exist |
| OUT-PIXEL-EDITOR | Edit or draw pixels manually | The promise is selection and semantic recoloring, not replacing a dedicated pixel editor | Off-catalog art must be edited externally | Phase 6 |
| OUT-ANIMATION-AUTHORING | Create or change animation frames | MVP consumes declared pack animations and only previews them | Idle and walk timing can be selected only through pack data | Phase 6 |
| OUT-MATERIAL-MAPS | Generate normal, specular, or emissive maps | Unlit character delivery is complete without speculative material inference | Exports contain diffuse sprites only | Phase 6 after manual editing |
| OUT-MOUNTS | Build mounts or rider pairings | Requires different frames, masks, and compositing rules that do not prove the humanoid MVP | Subject type is humanoid only | Phase 4 after pack contract validation |
| OUT-CREATURES | Build animals or non-humanoid creatures | Different animation contracts should be learned from a later real implementation | No alternate skeletons | Phase 4 |
| OUT-ADVANCED-ANIMATIONS | Preview spellcast, thrust, shoot, slash, hurt, run, climb, or jump | Idle and walk are sufficient to prove four-direction animation, export, and engine import | Packs may carry only idle and walk in MVP | Post-MVP content expansion |
| OUT-WEAPONS | Use oversize animated weapons | Oversize sheets introduce frame geometry not needed by the first two animations | Equipment is limited to non-oversize tools or decorative layers | Phase 4 |
| OUT-CUSTOM-PACK-AUTHORING | Create, install, or validate user-authored packs | A second built-in pack proves the data boundary before exposing authoring UX | Only bundled packs are selectable | Phase 4 |
| OUT-UNITY | Export native Unity assets | Godot is the deliberately chosen engine proof and generic JSON remains portable | Unity users consume the generic package manually | Phase 4 export adapter |
| OUT-LIVE-LINK | Automatically update a running engine project | A deterministic downloadable Godot package closes the MVP integration promise without filesystem permissions or plugins | Users re-export after edits | Phase 6 |
| OUT-CLI-API | Drive generation through a public CLI or API | The headless core is architecturally callable but the customer MVP is the interactive journey | Automation is internal to tests only | Phase 6 |
| OUT-BULK | Generate many randomized NPCs | Bulk policies and uniqueness controls are a separate user job | Characters are composed one at a time | Post-MVP automation stage |
| OUT-CLOUD | Sync projects through an account or cloud service | Local persistence satisfies return use without identity, infrastructure, or privacy scope | Projects remain in the current browser | North Star |
| OUT-COLLABORATION | Share or co-edit projects | The target user is solo/small-team and collaboration does not affect character correctness | No multi-user state | North Star |
| OUT-MARKETPLACE | Browse or purchase community content | Pack consumption must prove stable before distribution economics | No remote catalog | After open pack ecosystem |
| OUT-PROJECT-LIBRARY | Manage several saved projects in an in-app library | One named local project proves create, rename, save, reload, recovery, and deterministic rebuild without adding library lifecycle behavior | Saving a newly created project replaces the current local saved project | Post-MVP project-management stage |
| OUT-MULTIPLE-CHARACTERS | Manage several character recipes inside one project | One complete character is sufficient to prove pack composition, project theming, persistence, export, and provenance end to end | The MVP project contains one Hero recipe | Post-MVP project-management stage |

An item absent from both sections is an omission to fix, not an implicit exclusion.
