# UPD-004 Product And Experience Specification

## 1. User Need

Small game teams commonly need a hero, NPCs, enemies, and variants that share one visual theme and terrain context. Creating a separate project for every character fragments backups, theme changes, content-pack provenance, and project identity. A project therefore owns a character collection, while each character remains an independently named and serialized recipe.

## 2. Information Model

- A project owns 1–16 character recipes in stable `recipeIds` order.
- Exactly one listed recipe is active.
- Character names are trimmed, 1–80 characters, and unique within a project under Unicode case-insensitive comparison.
- Recipe IDs never change during rename or editing.
- Project theme and preview settings are shared. Character selections, pack ID, name, and token overrides are recipe-local.
- Project save is atomic. “Saved separately” means separate recipe records/files and edit isolation, not independent project revisions.

## 3. Character Collection

The Project view leads with **Characters** above the existing project facts and shows one row per recipe in stable order. Each row displays name, content pack, readiness, and Active state. The active row has `aria-current="true"` and a visible text label `Active`; no icon or color alone communicates selection. It exposes **Edit**, **Duplicate**, **Rename**, and **Delete**. An inactive row exposes **Open character**, **Duplicate**, **Rename**, and **Delete**; managing an inactive character does not activate it unless duplication succeeds, because a new duplicate always becomes active.

The header and persistent live preview name the active character so users never edit or export an ambiguous target. Compose, Theme override, Preview, and character Export headings also name the active character.

## 4. Create Character

**Create character** opens a modal with a required name. The new recipe uses the active character’s exact pack and that pack manifest’s initial `defaults` value for every composition slot. It does not copy the active character’s selections or overrides. The project theme and preview settings remain shared. Creation:

1. validates capacity and unique name;
2. creates a new stable recipe ID;
3. appends it to `recipeIds`;
4. makes it active;
5. marks the project Unsaved;
6. leaves all existing recipes and terrain unchanged.

Cancel restores focus to the button that opened the modal and writes nothing. If that trigger is unavailable, focus moves to the character list. Validation failure keeps the modal open, preserves the attempted draft, keeps focus in the field, sets `aria-invalid="true"`, shows one adjacent message, and writes nothing:

- blank after normalization: `Character name required`;
- more than 80 characters: `Name must be 80 characters or less`;
- normalized case-insensitive duplicate: `Character already named <existing name>`.

At 16 recipes **Create character** is disabled and adjacent visible text says `Maximum 16 characters per project`.

## 5. Switch And Edit Isolation

**Open character** changes only `activeRecipeId` and project `updatedAt`, marks the project Unsaved so the last active character reopens, and takes the user to the Project view. The switched-to recipe is used as-is: its name, pack ID, selections, and overrides are not copied, normalized, or transformed. All existing composition, overrides, preview rendering, credits, readiness, and export operations resolve the active recipe only.

Editing one recipe may change only that recipe plus project `updatedAt`; sibling canonical bytes and terrain canonical bytes remain unchanged. Shared project theme and preview controls intentionally affect the active render because they are project-level.

## 6. Duplicate And Rename

**Duplicate** opens a name modal with deterministic prefill. If `<source name> copy` is unique, use it. Otherwise try `<source name> copy 2`, then `copy 3`, choosing the smallest positive suffix of 2 or greater whose normalized name is unique. The user may edit the prefill. Confirmation deep-copies the source recipe’s pack ID, selections, and overrides under a new ID/name, appends and activates it, and preserves the source exactly. The duplicate is independently editable.

**Rename** changes only the selected recipe name and project `updatedAt`. It uses the same exact messages, `aria-invalid`, draft preservation, and focus behavior as Create. Cancel returns focus to the selected row’s Rename button, or the list if unavailable. Invalid or duplicate names do not close the modal or mutate the graph.

## 7. Delete And Recovery

**Delete** opens a confirmation naming the exact character, its pack, and whether it is active. The sole remaining character cannot be deleted. Confirmation removes only that recipe. If active, the recipe at the deleted item’s next array index becomes active; when that index is out of bounds, the recipe at the previous index becomes active. The next successful project save creates the normal pre-save snapshot; restore brings the deleted character and prior active selection back. Cancel returns focus to that row’s Delete button, or the collection list if unavailable, and writes nothing.

## 8. Save, Reopen, Transfer, Export

- Browser autosave and manual save commit the project record and all recipe records in one IndexedDB transaction.
- Electron saves one project manifest plus one recipe file per listed recipe and removes stale recipe files only as part of a successful replacement.
- Backups and `.spriteproject` archives inventory each recipe separately and retain optional terrain.
- Reload/relaunch restores all names, order, active recipe, independent selections/overrides, and terrain.
- Character generic/Godot export exports the active character only and names that character in readiness/status content. Batch export is excluded.

## 9. Accessibility And Responsive Behavior

- Collection rows and commands are keyboard reachable in document order.
- Modals have labeled fields, Escape/Cancel, visible errors, and focus restoration.
- Active state is textual and not color-only.
- At 320px and 200% equivalent reflow, rows stack without document-level horizontal overflow.
- Destructive controls remain at least 24px and primary targets aim for 44px.

## 10. Explicit Non-Promises

No character folders/tags/search/reorder, batch export, cross-character scene placement, drag-and-drop, independent per-character project themes, recipe import from another project, merge, cloud sync, collaboration, or more than 16 characters. Baseline single-character readers retain their strict `recipeIds.length === 1` invariant and therefore reject a multi-character project before graph return or repository mutation rather than loading only one recipe.