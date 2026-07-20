# UPD-002 Threat and Failure Model

## Assets

- Existing projects, exact pack locks, snapshots, drafts, original imported PNG bytes, installed package bytes, and content-addressed blobs
- Provenance/license records and exported credits
- Electron filesystem authority and `userData` pack repository
- Browser storage quota and offline availability
- Application integrity, renderer isolation, and deterministic output

## Trust Boundaries

1. Local `.spritepack` and PNG inputs are untrusted even when selected by the user.
2. Browser renderer to IndexedDB is an unprivileged local boundary with quota/failure behavior.
3. Electron renderer to frozen preload/main is a privilege boundary; renderer paths are display-only.
4. Pack source URLs cross to external navigation only after explicit user activation and HTTPS validation.
5. Embedded packs cross project archive validation before project graph resolution.

## Threats and Required Responses

| ID | Threat / failure | Consequence | Required response | Verification |
|---|---|---|---|---|
| TH-201 | ZIP traversal, absolute/dot path, duplicate case-fold path, symlink, encryption | Write/read outside package boundary | Reject central directory before extraction with `pack-invalid` | Adversarial fixtures on both hosts |
| TH-202 | Expansion bomb, oversized entry/count/path/colors/assets | CPU/memory/disk exhaustion | Streamed hard limits, 100:1 ratio, bounded allocation, `pack-limit` | Boundary and one-over fixtures |
| TH-203 | Malformed PNG/CRC/decompression | Decoder exploit/crash or memory exhaustion | Maintained bounded parser before decode, strict profile, worker/chunk isolation, `image-invalid` | Fuzz corpus, malformed fixtures, no process crash |
| TH-204 | JSON prototype/unknown-key/number abuse | Schema confusion or host-state leakage | Strict schemas, plain data, finite numbers, unknown-key rejection | Boundary leakage fixtures |
| TH-205 | Same ID/version different bytes | Supply-chain substitution | Identity includes package SHA-256; reject `pack-conflict`; never overwrite | Conflict fixture |
| TH-206 | Missing or wrong exact pack | Silent visual/export drift | Block preview/export, preserve project, exact locate/install only | Missing-lock flows |
| TH-207 | Pack scripts/plugins/SVG/remote image | Code execution or tracking | Data-only allowlist; reject executable/unlisted media; CSP | Package fixtures and request capture |
| TH-208 | Malicious source URL | Unexpected scheme/navigation | Absolute HTTPS schema; escaped display; existing user-activated external-open policy | `javascript:`, file, data, malformed URL fixtures |
| TH-209 | False or incompatible license claims | Legal exposure | Require structured offered/chosen metadata and author confirmation; deterministic attribution; explicit no-legal-advice language; do not claim clearance | Authoring UX and credits fixtures |
| TH-210 | Renderer forges path/grant/channel | Arbitrary filesystem operation | Opaque scoped grants, frozen named methods/channels, main validation, no raw path authority | Pack bridge contract/adversarial tests |
| TH-211 | TOCTOU or reparse escape during Electron pack read/write | Read/write outside approved location | Resolve existing components, reject symlinks/reparse escape, atomic sibling replacement, revalidate before commit | Filesystem adversarial fixtures |
| TH-212 | Interrupted install/remove/index write | Partial selectable package or lost content | Complete temp payload, read-back, atomic index/transaction, rollback prior index, refcount after commit | Kill/fault injection |
| TH-213 | Reference-count race | Delete blob used by project/draft/version | Recompute dependencies in transaction, expected index revision, one last-known-good package, no implicit cleanup | Concurrency fixtures |
| TH-214 | Quota/disk full | Lost draft or incomplete install | Preserve dirty state/source/last committed data; safe cleanup preview; backup/recovery; commit nothing | Quota/disk fixtures |
| TH-215 | Embedded pack smuggling | Project import bypasses pack validation | Validate embedded package under exact pack contract before project graph; lock must match bytes | Project archive v2 adversarial fixtures |
| TH-216 | Diagnostics leak user art | Unintended content disclosure | Reports include hashes, paths, dimensions, codes, and metadata only; full PNG only in explicit recovery export | Report inspection |
| TH-217 | Stale draft/project edit | Silent overwrite | Integer revision/fingerprint compare; write nothing; explicit recovery choices | Same-origin/desktop concurrency flows |
| TH-218 | Older host opens v2 project | Drops embedded required content | Unsupported archive v2 fails before extraction/mutation | Old-reader fixture |

## Accepted Risks

- Product cannot prove art ownership or legal compatibility; the author assertion and exact metadata reduce ambiguity but do not transfer legal responsibility.
- Local users may install intentionally offensive or low-quality art; there is no hosted moderation in a local-file ecosystem.
- Unsigned Electron distribution retains SmartScreen friction from UPD-001.

## Permanently Rejected in Format v1

Executable code, plugins, shaders, SVG, HTML, remote resources, arbitrary file paths, custom decoders, encrypted entries, links, and arbitrary license prose.
