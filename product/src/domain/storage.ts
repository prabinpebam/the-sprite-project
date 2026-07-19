import { STORAGE_KEY } from './project'
import type { SpriteProject } from './types'

export interface LoadResult {
  project: SpriteProject | null
  error: string | null
}

export function saveProject(project: SpriteProject): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(project))
}

export function clearProject(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function loadProject(): LoadResult {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return { project: null, error: null }
  try {
    const value = JSON.parse(raw) as Partial<SpriteProject>
    if (value.schemaVersion !== 1 || !value.name || !value.packId || !value.character || !value.theme || !value.preview) {
      return { project: null, error: 'The saved project is incomplete or uses an unsupported version.' }
    }
    return { project: value as SpriteProject, error: null }
  } catch {
    return { project: null, error: 'The saved project could not be read.' }
  }
}
