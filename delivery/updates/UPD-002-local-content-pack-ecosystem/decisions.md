# UPD-002 Proposed Decisions

## DEC-UPD002-PHASE-BOUNDARY

- **Decision:** UPD-002 opens the local humanoid content ecosystem before terrain, scenes, non-humanoids, or engine-adapter expansion.
- **Decision state:** proposed
- **Reversible:** Yes
- **Evidence:** docs/planning/overview.html Phase 4 and anti-bundling rule in product-update governance
- **Status:** specified

## DEC-UPD002-PACK-FORMAT

- **Decision:** Use one deterministic data-only .spritepack ZIP format with independent pack container, pack schema, and draft schema versions.
- **Decision state:** proposed
- **Reversible:** No
- **Evidence:** UPD-001 canonical archive and cross-host compatibility patterns
- **Status:** specified

## DEC-UPD002-HUMANOID-PROFILE

- **Decision:** Format version 1 authoring accepts exact 256x512 RGBA PNG sheets for the current 64px humanoid idle/walk four-direction layout and current six slots only.
- **Decision state:** proposed
- **Reversible:** No
- **Evidence:** Current renderer geometry and requirement to avoid speculative multi-profile abstraction
- **Status:** specified

## DEC-UPD002-DATA-ONLY

- **Decision:** Packs contain strict JSON, PNG, and UTF-8 text only; scripts, plugins, SVG, shaders, links, and custom decoders are rejected.
- **Decision state:** proposed
- **Reversible:** No
- **Evidence:** Local untrusted-input boundary and zero-server/offline product strategy
- **Status:** specified

## DEC-UPD002-SIDE-BY-SIDE

- **Decision:** Pack ID, SemVer, and payload checksum form exact identity; versions install side by side and project locks change only through explicit checkpointed action.
- **Decision state:** proposed
- **Reversible:** Yes
- **Evidence:** UPD-001 exact pack-lock and no-silent-drift contracts
- **Status:** specified

## DEC-UPD002-LICENSE-PROFILES

- **Decision:** Authoring supports a reviewed finite license vocabulary with offered and chosen licenses plus deterministic attribution; arbitrary custom terms are excluded and the product does not provide legal advice.
- **Decision state:** proposed
- **Reversible:** Yes
- **Evidence:** LPC research and MVP provenance contract
- **Status:** specified

## DEC-UPD002-ADAPTER-DEFER

- **Decision:** The next engine adapter remains a separate update because target selection, output contract, downstream fixture, and rollback are independent of pack ecosystem delivery.
- **Decision state:** proposed
- **Reversible:** Yes
- **Evidence:** Product update anti-bundling rule and independent export-adapter ownership
- **Status:** specified

These decisions are review candidates. They are not locked until explicit product-owner approval.
