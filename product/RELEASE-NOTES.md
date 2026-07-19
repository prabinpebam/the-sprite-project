# The Sprite Project 0.1.0

## Windows portable preview

- Supports Windows x64.
- Portable ZIP: extract it to a writable folder and run `The Sprite Project.exe`. No installer or administrator rights are required.
- This preview is unsigned. Windows SmartScreen may show an unrecognized-app warning. Choose **More info**, verify the displayed application name, then choose **Run anyway** only when the ZIP hash matches the published `.sha256` file.
- Built from the repository lockfile with Electron 40.10.6, React 19, TypeScript 6, and Vite 8.

## Upgrade and rollback

To upgrade, close the application, extract the new ZIP to a separate application folder, verify its hash, and open the new executable. Project folders and `.spriteproject` archives are stored outside the application directory and are not moved or deleted during upgrade.

To roll back, close the application and reopen the prior extracted version. Do not delete project folders or browser data. The web host remains independently available and Electron artifacts can be withdrawn without changing the shared project format.