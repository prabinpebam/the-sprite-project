# The Sprite Project 0.1.0

## Windows portable preview

- Supports Windows x64.
- Portable ZIP: extract it to a writable folder and run `The Sprite Project.exe`. No installer or administrator rights are required.
- This preview is unsigned. Windows SmartScreen may show an unrecognized-app warning. Choose **More info**, verify the displayed application name, then choose **Run anyway** only when the ZIP hash matches the published `.sha256` file.
- Built from the repository lockfile with Electron 40.10.6, React 19, TypeScript 6, and Vite 8.

## Local content packs

- Compatible `.spritepack` files are validated as data-only JSON, PNG, and UTF-8 text before installation.
- Installed packages are stored under the application's local `userData/packs/v1` repository with a canonical index and content-addressed immutable package files.
- Pack drafts and original imported PNG bytes use the renderer's local IndexedDB origin. Use **Download recovery** before moving or clearing application data.
- Projects using non-bundled packs export `.spriteproject` archive version 2 with the exact required `.spritepack` bytes embedded. Embedded content remains project-scoped unless explicitly installed into the pack library.
- Pack ID, version, canonical pack-document checksum, and complete package checksum are exact identities. Enabling or disabling a pack affects only future selections; locked projects retain their exact content.

## Upgrade and rollback

To upgrade, close the application, extract the new ZIP to a separate application folder, verify its hash, and open the new executable. Project folders and `.spriteproject` archives are stored outside the application directory and are not moved or deleted during upgrade. The application revalidates the pack index and immutable package bytes when they are activated.

To roll back, first export authored packs, draft recovery ZIPs, and dependent project backups. Close the application and reopen a prior extracted version that retains `.spritepack` v1, runtime pack v2, draft v1, and `.spriteproject` archive v2 readers. Do not delete project folders, browser data, `userData`, installed packages, draft sources, provenance, or recovery files. Authoring may be disabled during withdrawal, but readers must remain available. The web host and Electron artifact can be withdrawn independently without converting shared files.