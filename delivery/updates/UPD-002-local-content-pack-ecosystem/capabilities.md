# UPD-002 User-Can Catalog

| ID | Host | User can statement | Scenarios | Status |
|---|---|---|---|---|
| UC-PACK-CHOOSE-FILE | shared | User can choose a local .spritepack file without granting arbitrary path authority. | `SC-PACK-FIRST-INSTALL`, `SC-PACK-INVALID` | specified |
| UC-PACK-INSPECT | shared | User can inspect pack identity, version, subject, assets, coverage, tokens, provenance, size, and warnings before install. | `SC-PACK-FIRST-INSTALL`, `SC-PACK-INVALID` | specified |
| UC-PACK-INSTALL | shared | User can transactionally install a validated exact pack version for offline use. | `SC-PACK-FIRST-INSTALL` | specified |
| UC-PACK-REJECT | shared | User can see a stable actionable rejection without changing existing content. | `SC-PACK-INVALID` | specified |
| UC-PACK-LIST | shared | User can list bundled, installed, embedded, disabled, missing, and in-use pack versions. | `SC-PACK-LIBRARY` | specified |
| UC-PACK-ENABLE | shared | User can enable or disable an installed pack for new selections without changing existing locks. | `SC-PACK-LIBRARY` | specified |
| UC-PACK-INSTALL-VERSION | shared | User can install multiple versions of one pack side by side. | `SC-PACK-UPDATE` | specified |
| UC-PACK-ACTIVATE-VERSION | shared | User can explicitly change a project to a compatible installed version after preview and checkpoint. | `SC-PACK-UPDATE` | specified |
| UC-PACK-REMOVE | shared | User can remove an unused installed version after explicit confirmation. | `SC-PACK-REMOVE` | specified |
| UC-PACK-PROTECT-IN-USE | shared | User can see why an in-use version cannot be removed and which projects depend on it. | `SC-PACK-REMOVE` | specified |
| UC-PACK-RECOVER-MISSING | shared | User can locate or install the exact missing pack checksum and resume a blocked project. | `SC-PACK-MISSING-RECOVERY` | specified |
| UC-PACK-REPLACE-COPY | shared | User can replace an unavailable pack only in a new project copy after compatibility preview. | `SC-PACK-MISSING-RECOVERY` | specified |
| UC-PACK-DRAFT-CREATE | shared | User can create a pack draft with stable ID, SemVer version, name, description, and humanoid subject profile. | `SC-PACK-AUTHOR-START` | specified |
| UC-PACK-ASSET-IMPORT | shared | User can import a compatible PNG layer sheet and retain the original bytes in the draft. | `SC-PACK-AUTHOR-START`, `SC-PACK-AUTHOR-RECOVERY` | specified |
| UC-PACK-ASSET-CONFIGURE | shared | User can assign asset ID, display name, slot, description, and idle/walk coverage. | `SC-PACK-AUTHOR-START` | specified |
| UC-PACK-TOKEN-BIND | shared | User can classify each source color as fixed or bind it to a semantic token and shade. | `SC-PACK-AUTHOR-TOKENS` | specified |
| UC-PACK-PREVIEW | shared | User can preview the authored asset through the same runtime renderer used by installed packs. | `SC-PACK-AUTHOR-TOKENS`, `SC-PACK-AUTHOR-PROVENANCE` | specified |
| UC-PACK-PROVENANCE | shared | User can record supported license and attribution metadata for every asset. | `SC-PACK-AUTHOR-PROVENANCE` | specified |
| UC-PACK-DRAFT-SAVE | shared | User can rely on transactional local draft autosave and reopen imported source bytes. | `SC-PACK-AUTHOR-RECOVERY` | specified |
| UC-PACK-DRAFT-RECOVER | shared | User can download recovery data or remove an offending asset when a draft cannot validate. | `SC-PACK-AUTHOR-RECOVERY` | specified |
| UC-PACK-VALIDATE | shared | User can validate the complete pack and navigate directly to every blocking field or asset. | `SC-PACK-AUTHOR-PROVENANCE`, `SC-PACK-AUTHOR-RECOVERY` | specified |
| UC-PACK-EXPORT | shared | User can export a deterministic .spritepack and matching human-readable validation report. | `SC-PACK-AUTHOR-PROVENANCE`, `SC-PACK-CROSS-HOST` | specified |
| UC-PACK-SELF-INSTALL | shared | User can install the exported pack as a test copy before distributing it. | `SC-PACK-AUTHOR-PROVENANCE` | specified |
| UC-PACK-CROSS-HOST | cross-host | User can transfer authored packs and dependent projects between web and Electron with exact parity. | `SC-PACK-CROSS-HOST`, `SC-PACK-EMBEDDED-OFFLINE` | specified |
