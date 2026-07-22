# UPD-004 Change Proposal

## Request

> I should be able to create multiple characters in the same project and save them separately within the project. Detail out this user need and use product update pipeline to execute this.

## Outcome

A developer can maintain a bounded collection of named character documents inside one project, switch among them, edit and save each without changing siblings, and recover from rename, duplication, or deletion. Terrain remains one project-level producer and character export remains explicit for the active character.

## Why Now

The project graph, recipe store, folder layout, and archive inventory already use `recipeIds` and `recipes/<id>.json`; the current single-character restriction is a schema/UI gate rather than an architectural requirement. Removing it proves that a project is a reusable asset workspace rather than a one-character file.

## Authority And Boundary

The direct 2026-07-22 product-owner request authorizes full specification, review, lock, implementation, evidence, and documentation. This update does not add folders, tags, batch export, cross-character scenes, per-character global themes, or collaborative editing.