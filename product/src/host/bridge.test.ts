import { describe, expect, it } from 'vitest'
import { CHANNELS } from '../../electron/channels'
import { parseGrantId, parseSaveProjectRequest, parseWriteExportRequest } from './validation'

describe('Electron renderer bridge contract', () => {
  it('locks exactly twelve unique internal channels', () => {
    expect(CHANNELS).toEqual({
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
    })
    expect(new Set(Object.values(CHANNELS))).toHaveLength(12)
  })

  it('accepts only opaque UUID grants and strict save request keys', () => {
    const destinationGrantId = crypto.randomUUID()
    expect(parseGrantId(destinationGrantId)).toBe(destinationGrantId)
    expect(() => parseGrantId('C:\\project')).toThrow()
    expect(() => parseSaveProjectRequest({ destinationGrantId, graph: {}, expectedFingerprint: null, displayPath: 'C:\\project' })).toThrow()
  })

  it('rejects export payloads beyond the 128-entry bridge limit', () => {
    const value = { destinationGrantId: crypto.randomUUID(), entries: Array.from({ length: 129 }, (_, index) => ({ relativePath: `${index}.bin`, bytes: new Uint8Array() })) }
    expect(() => parseWriteExportRequest(value)).toThrow()
  })
})