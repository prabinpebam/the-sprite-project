# UPD-001 Customer Promise

**Update:** Dual-Host Local-First MVP (UPD-001)

**Baseline:** f29c9f9b8ea69df0f225f1b025b44cd7f30cc1bb / RUN-MVP-001

**Status:** specified

**Target user:** Solo and small-team game developers who need zero-install access or convenient local file workflows without a hosted account service

**Objective quality gate:** Every new or changed task flow passes through the actual UI on its declared host, every affected baseline flow passes regression, and cross-host project and output parity is exact

## CP-WEB-LOCAL-WORKSPACE - A developer can open the GitHub Pages product without installation, manage ordinary projects locally, and continue without an application server.

- **Host:** web
- **User:** A developer who wants immediate browser access
- **Context:** Using the published GitHub Pages application on a supported browser
- **Trigger:** They need to create or continue sprite work
- **Observable outcome:** Projects are listed, opened, autosaved, recovered, and backed up locally through IndexedDB and portable archives
- **Quality expectation:** Ordinary project work survives browser restart, exposes storage status, and never depends on paid infrastructure
- **Recovery expectation:** The user can restore snapshots or import a project archive when browser state is damaged or cleared
- **Acceptance evidence:** Web project-library, persistence, backup, offline, and data-custody flows pass on the published-subpath build
- **Status:** specified

## CP-DESKTOP-PORTABLE-WORKSPACE - A developer can run a portable Electron edition locally and use ordinary project folders and export folders without repetitive browser downloads.

- **Host:** desktop
- **User:** A developer who prefers direct local file operations
- **Context:** Using the portable Windows x64 Electron ZIP without an installer
- **Trigger:** They need durable folders, direct saving, or repeated engine exports
- **Observable outcome:** The user creates or opens a project folder, saves atomically, recovers safely, and writes generic or Godot output into a selected directory
- **Quality expectation:** The portable host requires no administrator rights and exposes only narrow user-approved filesystem operations
- **Recovery expectation:** Save conflicts, missing folders, external changes, and unsaved close attempts fail visibly without losing the last known-good project
- **Acceptance evidence:** Portable launch, folder lifecycle, direct export, and unsaved-close flows pass in packaged Electron
- **Status:** specified

## CP-CROSS-HOST-PORTABILITY - A developer can move the same project between web and desktop without changing its creative meaning, provenance, or generated output.

- **Host:** cross-host
- **User:** A developer alternating between browser convenience and desktop file access
- **Context:** Transferring a versioned .spriteproject archive or opening an equivalent project folder
- **Trigger:** They switch host or device or re-save a project file in the other host
- **Observable outcome:** Both hosts open and save the same .spriteproject format and load the same project schema, pack locks, recipes, themes, credits, and export contract
- **Quality expectation:** Canonical project bytes are deterministic and semantic project data, render hashes, credits, and engine metadata remain identical across hosts
- **Recovery expectation:** Unsupported versions and missing packs fail closed with an intact source archive and actionable resolution
- **Acceptance evidence:** Web-to-desktop and desktop-to-web round trips pass with exact parity assertions
- **Status:** specified

## CP-LOCAL-DATA-CUSTODY - A developer retains custody of project and art data without an account or silent upload.

- **Host:** shared
- **User:** A developer responsible for preserving creative work
- **Context:** Working in either host
- **Trigger:** They inspect storage, back up work, or choose where files are written
- **Observable outcome:** The product states where data lives, provides portable backup, and performs no undeclared project-data transfer
- **Quality expectation:** Storage and destination status are visible before destructive or external operations
- **Recovery expectation:** A user-owned archive or project folder restores work independently of one browser profile or app session
- **Acceptance evidence:** Data-custody and cross-host flows pass with zero undeclared network or filesystem activity
- **Status:** specified

## Governance

These promises layer above the immutable verified MVP baseline. They are specified, not implemented or verified. Any change begins as a new update or an explicit revision to UPD-001 before implementation evidence exists.
