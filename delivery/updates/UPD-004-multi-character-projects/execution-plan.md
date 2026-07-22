# UPD-004 Execution Plan

| Work package | Depends on | Gate |
|---|---|---|
| WP-UPD004-SPEC | None | Complete graph, deep review, approval, and lock validate. |
| WP-UPD004-DOMAIN | SPEC | 1–16 schema and pure CRUD/isolation tests pass. |
| WP-UPD004-PERSISTENCE | DOMAIN | Removed rows/files, snapshots, archives, and old-reader tests pass. |
| WP-UPD004-UX | DOMAIN | Collection/dialog/active-context UI passes keyboard and reflow checks. |
| WP-UPD004-HOSTS | PERSISTENCE, UX | Web, packaged Electron, offline, and cross-host flows pass. |
| WP-UPD004-REGRESSION | HOSTS | MVP through UPD-003 regressions pass with no terrain or character drift. |
| WP-UPD004-PROMOTION | REGRESSION | Evidence owns implemented status and docs generation. |

Implement in dependency order. No implementation may broaden excluded organization, batch, scene, theme, or collaboration scope.