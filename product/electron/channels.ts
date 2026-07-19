export const CHANNELS = {
  getHostInfo: 'host:get-info',
  listRecentProjects: 'recent:list',
  openRecentProject: 'recent:open',
  forgetRecentProject: 'recent:forget',
  chooseProjectFolder: 'dialog:project-folder',
  chooseProjectFile: 'dialog:project-file',
  chooseExportDirectory: 'dialog:export-directory',
  readProject: 'project:read',
  saveProject: 'project:save',
  inspectArchive: 'archive:inspect',
  writeArchive: 'archive:write',
  writeExport: 'export:write',
} as const