# UPD-004 Decisions

| ID | Decision | State |
|---|---|---|
| DEC-UPD004-COLLECTION | Project owns 1–16 stable ordered recipe IDs with one active recipe. | proposed for lock |
| DEC-UPD004-SAVE | Recipes serialize separately but share one atomic project revision/save. | proposed for lock |
| DEC-UPD004-SCHEMA | Keep project schema v2 and archive v1/v2/v3 because existing fields/paths already reserve multiplicity. | proposed for lock |
| DEC-UPD004-ACTIVE | `activeRecipeId` is the only UI selection source of truth and is persisted. | proposed for lock |
| DEC-UPD004-THEME | Project theme/preview stay shared; selections and overrides stay recipe-local. | proposed for lock |
| DEC-UPD004-DELETE | Minimum one recipe; active deletion selects next then previous and is snapshot-recoverable. | proposed for lock |
| DEC-UPD004-EXPORT | Existing character export targets the active character only; batch export is deferred. | proposed for lock |