export const SUPPORTED_LICENSES = [
  'CC0-1.0',
  'CC-BY-3.0',
  'CC-BY-4.0',
  'CC-BY-SA-3.0',
  'CC-BY-SA-4.0',
  'OGA-BY-3.0',
  'GPL-3.0-only',
  'GPL-3.0-or-later',
] as const

export type SupportedLicense = (typeof SUPPORTED_LICENSES)[number]

export interface LicenseProfile {
  id: SupportedLicense
  label: string
  referenceUrl: string
  attributionRequired: boolean
  defaultExportWording: string
  offeredCompatibility: SupportedLicense[]
}

function profile(id: SupportedLicense, label: string, referenceUrl: string, attributionRequired: boolean): LicenseProfile {
  return {
    id,
    label,
    referenceUrl,
    attributionRequired,
    defaultExportWording: attributionRequired ? 'Credit the author, source, and chosen license.' : 'Attribution is appreciated but not required.',
    offeredCompatibility: [id],
  }
}

export const LICENSE_PROFILES: Record<SupportedLicense, LicenseProfile> = {
  'CC0-1.0': profile('CC0-1.0', 'Creative Commons Zero 1.0', 'https://creativecommons.org/publicdomain/zero/1.0/', false),
  'CC-BY-3.0': profile('CC-BY-3.0', 'Creative Commons Attribution 3.0', 'https://creativecommons.org/licenses/by/3.0/', true),
  'CC-BY-4.0': profile('CC-BY-4.0', 'Creative Commons Attribution 4.0', 'https://creativecommons.org/licenses/by/4.0/', true),
  'CC-BY-SA-3.0': profile('CC-BY-SA-3.0', 'Creative Commons Attribution-ShareAlike 3.0', 'https://creativecommons.org/licenses/by-sa/3.0/', true),
  'CC-BY-SA-4.0': profile('CC-BY-SA-4.0', 'Creative Commons Attribution-ShareAlike 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/', true),
  'OGA-BY-3.0': profile('OGA-BY-3.0', 'OpenGameArt Attribution 3.0', 'https://opengameart.org/content/oga-by-30-faq', true),
  'GPL-3.0-only': profile('GPL-3.0-only', 'GNU General Public License 3.0 only', 'https://www.gnu.org/licenses/gpl-3.0.html', true),
  'GPL-3.0-or-later': profile('GPL-3.0-or-later', 'GNU General Public License 3.0 or later', 'https://www.gnu.org/licenses/gpl-3.0.html', true),
}