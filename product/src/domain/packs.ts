import type { ContentPack, PackAsset, PixelPart, Provenance, SlotId } from './types'

const allDirections = ['south', 'west', 'east', 'north'] as const
const coverage = ['idle', 'walk'] as const

function source(pack: string): Provenance {
  return {
    author: 'The Sprite Project',
    source: `${pack} Original Demonstration Pack`,
    sourceUrl: 'https://github.com/prabinpebam/the-sprite-project',
    license: 'CC0-1.0',
    chosenLicense: 'CC0-1.0',
  }
}

function asset(pack: string, id: string, name: string, slot: SlotId, description: string, parts: PixelPart[]): PackAsset {
  return { id, name, slot, description, parts, coverage: [...coverage], provenance: source(pack) }
}

const standardBody: PixelPart[] = [
  { x: 12, y: 6, width: 8, height: 8, token: 'skin', outline: true, motion: 'bob' },
  { x: 10, y: 8, width: 2, height: 4, token: 'skin', outline: true, motion: 'bob', directions: ['south', 'north'] },
  { x: 20, y: 8, width: 2, height: 4, token: 'skin', outline: true, motion: 'bob', directions: ['south', 'north'] },
  { x: 15, y: 14, width: 2, height: 3, token: 'skin', motion: 'bob' },
  { x: 9, y: 17, width: 3, height: 5, token: 'skin', outline: true, motion: 'leftHand' },
  { x: 20, y: 17, width: 3, height: 5, token: 'skin', outline: true, motion: 'rightHand' },
  { x: 14, y: 10, width: 1, height: 1, token: 'outline', motion: 'bob', directions: ['south'] },
  { x: 18, y: 10, width: 1, height: 1, token: 'outline', motion: 'bob', directions: ['south'] },
  { x: 19, y: 10, width: 1, height: 1, token: 'outline', motion: 'bob', directions: ['east'] },
  { x: 12, y: 10, width: 1, height: 1, token: 'outline', motion: 'bob', directions: ['west'] },
]

const leanBody: PixelPart[] = [
  ...standardBody.map(part => ({ ...part, x: part.x + (part.x < 16 ? 1 : part.x > 16 ? -1 : 0) })),
]

const wayfarerAssets: PackAsset[] = [
  asset('Wayfarer', 'wayfarer.body.standard', 'Standard build', 'body', 'Balanced adult humanoid base.', standardBody),
  asset('Wayfarer', 'wayfarer.body.lean', 'Lean build', 'body', 'Narrow adult humanoid base.', leanBody),
  asset('Wayfarer', 'wayfarer.hair.crop', 'Trail crop', 'hair', 'Short practical hair with a side fringe.', [
    { x: 11, y: 5, width: 10, height: 4, token: 'hair', outline: true, motion: 'bob' },
    { x: 11, y: 8, width: 2, height: 4, token: 'hair', motion: 'bob', directions: ['south', 'west'] },
    { x: 19, y: 8, width: 2, height: 3, token: 'hair', motion: 'bob', directions: ['north', 'east'] },
  ]),
  asset('Wayfarer', 'wayfarer.hair.braid', 'Long braid', 'hair', 'Tied hair with a directional braid.', [
    { x: 11, y: 5, width: 10, height: 4, token: 'hair', outline: true, motion: 'bob' },
    { x: 11, y: 8, width: 2, height: 6, token: 'hair', motion: 'bob' },
    { x: 20, y: 10, width: 2, height: 8, token: 'hair', outline: true, motion: 'sway', directions: ['south', 'east'] },
    { x: 10, y: 10, width: 2, height: 8, token: 'hair', outline: true, motion: 'sway', directions: ['west', 'north'] },
  ]),
  asset('Wayfarer', 'wayfarer.headwear.hood', 'Traveler hood', 'headwear', 'Soft hood with contrasting edge.', [
    { x: 10, y: 4, width: 12, height: 6, token: 'clothPrimary', outline: true, motion: 'bob' },
    { x: 12, y: 7, width: 8, height: 4, token: 'clothSecondary', shade: -1, motion: 'bob', directions: ['north'] },
  ]),
  asset('Wayfarer', 'wayfarer.headwear.band', 'Trail band', 'headwear', 'Simple cloth headband.', [
    { x: 11, y: 7, width: 10, height: 2, token: 'clothSecondary', outline: true, motion: 'bob' },
    { x: 21, y: 8, width: 3, height: 2, token: 'clothSecondary', motion: 'sway', directions: ['south', 'east'] },
  ]),
  asset('Wayfarer', 'wayfarer.torso.tunic', 'Field tunic', 'torso', 'Layered tunic with a leather belt.', [
    { x: 10, y: 14, width: 12, height: 9, token: 'clothPrimary', outline: true, motion: 'bob' },
    { x: 9, y: 15, width: 3, height: 5, token: 'clothPrimary', outline: true, motion: 'leftHand' },
    { x: 20, y: 15, width: 3, height: 5, token: 'clothPrimary', outline: true, motion: 'rightHand' },
    { x: 11, y: 20, width: 10, height: 2, token: 'leather', motion: 'bob' },
    { x: 15, y: 20, width: 2, height: 2, token: 'metal', motion: 'bob' },
  ]),
  asset('Wayfarer', 'wayfarer.torso.vest', 'Scout vest', 'torso', 'Short vest over a contrasting shirt.', [
    { x: 10, y: 14, width: 12, height: 9, token: 'clothSecondary', outline: true, motion: 'bob' },
    { x: 12, y: 14, width: 8, height: 8, token: 'clothPrimary', motion: 'bob' },
    { x: 9, y: 15, width: 3, height: 5, token: 'clothSecondary', outline: true, motion: 'leftHand' },
    { x: 20, y: 15, width: 3, height: 5, token: 'clothSecondary', outline: true, motion: 'rightHand' },
  ]),
  asset('Wayfarer', 'wayfarer.legs.trousers', 'Travel trousers', 'legs', 'Straight trousers built for walking.', [
    { x: 11, y: 21, width: 5, height: 7, token: 'clothSecondary', outline: true, motion: 'leftFoot' },
    { x: 16, y: 21, width: 5, height: 7, token: 'clothSecondary', outline: true, motion: 'rightFoot' },
  ]),
  asset('Wayfarer', 'wayfarer.legs.wraps', 'Layered wraps', 'legs', 'Contrasting split leg wraps.', [
    { x: 11, y: 21, width: 5, height: 7, token: 'clothPrimary', outline: true, motion: 'leftFoot' },
    { x: 16, y: 21, width: 5, height: 7, token: 'clothPrimary', outline: true, motion: 'rightFoot' },
    { x: 12, y: 23, width: 3, height: 1, token: 'clothSecondary', motion: 'leftFoot' },
    { x: 17, y: 25, width: 3, height: 1, token: 'clothSecondary', motion: 'rightFoot' },
  ]),
  asset('Wayfarer', 'wayfarer.feet.boots', 'Trail boots', 'feet', 'Heavy leather boots.', [
    { x: 10, y: 27, width: 6, height: 4, token: 'leather', outline: true, motion: 'leftFoot' },
    { x: 16, y: 27, width: 6, height: 4, token: 'leather', outline: true, motion: 'rightFoot' },
  ]),
  asset('Wayfarer', 'wayfarer.feet.shoes', 'Soft shoes', 'feet', 'Low-profile walking shoes.', [
    { x: 11, y: 28, width: 5, height: 3, token: 'leather', outline: true, motion: 'leftFoot' },
    { x: 16, y: 28, width: 5, height: 3, token: 'leather', outline: true, motion: 'rightFoot' },
  ]),
]

const harborAssets: PackAsset[] = [
  asset('Harbor Watch', 'harbor.body.standard', 'Harbor build', 'body', 'Broad-shouldered original humanoid base.', standardBody),
  asset('Harbor Watch', 'harbor.hair.wave', 'Sea wave', 'hair', 'Swept hair shaped by the coast.', [
    { x: 10, y: 5, width: 12, height: 4, token: 'hair', outline: true, motion: 'bob' },
    { x: 10, y: 8, width: 3, height: 5, token: 'hair', motion: 'bob', directions: ['south', 'west'] },
    { x: 20, y: 7, width: 3, height: 3, token: 'hair', motion: 'sway', directions: ['south', 'east'] },
  ]),
  asset('Harbor Watch', 'harbor.hair.knot', 'Deck knot', 'hair', 'Close hair tied at the back.', [
    { x: 11, y: 5, width: 10, height: 4, token: 'hair', outline: true, motion: 'bob' },
    { x: 14, y: 3, width: 4, height: 3, token: 'hair', outline: true, motion: 'sway', directions: ['north', 'west', 'east'] },
  ]),
  asset('Harbor Watch', 'harbor.headwear.cap', 'Watch cap', 'headwear', 'Structured cap with a brass pin.', [
    { x: 10, y: 4, width: 12, height: 5, token: 'clothPrimary', outline: true, motion: 'bob' },
    { x: 11, y: 8, width: 12, height: 2, token: 'clothSecondary', motion: 'bob', directions: ['south', 'east', 'west'] },
    { x: 16, y: 6, width: 2, height: 2, token: 'metal', motion: 'bob', directions: ['south'] },
  ]),
  asset('Harbor Watch', 'harbor.torso.coat', 'Harbor coat', 'torso', 'Double-front coat with brass fasteners.', [
    { x: 9, y: 14, width: 14, height: 10, token: 'clothPrimary', outline: true, motion: 'bob' },
    { x: 8, y: 15, width: 4, height: 6, token: 'clothPrimary', outline: true, motion: 'leftHand' },
    { x: 20, y: 15, width: 4, height: 6, token: 'clothPrimary', outline: true, motion: 'rightHand' },
    { x: 15, y: 15, width: 2, height: 8, token: 'clothSecondary', motion: 'bob' },
    { x: 13, y: 17, width: 1, height: 1, token: 'metal', motion: 'bob' },
    { x: 18, y: 17, width: 1, height: 1, token: 'metal', motion: 'bob' },
  ]),
  asset('Harbor Watch', 'harbor.torso.shirt', 'Deck shirt', 'torso', 'Rolled-sleeve shirt with neck scarf.', [
    { x: 10, y: 14, width: 12, height: 9, token: 'clothSecondary', outline: true, motion: 'bob' },
    { x: 9, y: 15, width: 3, height: 4, token: 'clothSecondary', outline: true, motion: 'leftHand' },
    { x: 20, y: 15, width: 3, height: 4, token: 'clothSecondary', outline: true, motion: 'rightHand' },
    { x: 13, y: 14, width: 6, height: 3, token: 'clothPrimary', motion: 'bob' },
  ]),
  asset('Harbor Watch', 'harbor.legs.deck', 'Deck trousers', 'legs', 'High-waisted work trousers.', [
    { x: 10, y: 21, width: 6, height: 7, token: 'clothSecondary', outline: true, motion: 'leftFoot' },
    { x: 16, y: 21, width: 6, height: 7, token: 'clothSecondary', outline: true, motion: 'rightFoot' },
  ]),
  asset('Harbor Watch', 'harbor.legs.short', 'Shore trousers', 'legs', 'Shorter trousers with visible socks.', [
    { x: 11, y: 21, width: 5, height: 5, token: 'clothPrimary', outline: true, motion: 'leftFoot' },
    { x: 16, y: 21, width: 5, height: 5, token: 'clothPrimary', outline: true, motion: 'rightFoot' },
    { x: 12, y: 26, width: 4, height: 2, token: 'white', outline: true, motion: 'leftFoot' },
    { x: 16, y: 26, width: 4, height: 2, token: 'white', outline: true, motion: 'rightFoot' },
  ]),
  asset('Harbor Watch', 'harbor.feet.deckboots', 'Deck boots', 'feet', 'Salt-darkened work boots.', [
    { x: 10, y: 27, width: 6, height: 4, token: 'leather', outline: true, motion: 'leftFoot' },
    { x: 16, y: 27, width: 6, height: 4, token: 'leather', outline: true, motion: 'rightFoot' },
    { x: 11, y: 27, width: 4, height: 1, token: 'metal', shade: -1, motion: 'leftFoot' },
    { x: 17, y: 27, width: 4, height: 1, token: 'metal', shade: -1, motion: 'rightFoot' },
  ]),
]

export const PACKS: ContentPack[] = [
  {
    id: 'wayfarer', version: '1.0.0', name: 'Wayfarer',
    description: 'Original trail-ready layers with tunics, wraps, and travel gear.',
    assets: wayfarerAssets,
    defaults: {
      body: 'wayfarer.body.standard', hair: 'wayfarer.hair.crop', headwear: null,
      torso: 'wayfarer.torso.tunic', legs: 'wayfarer.legs.trousers', feet: 'wayfarer.feet.boots',
    },
  },
  {
    id: 'harbor', version: '1.0.0', name: 'Harbor Watch',
    description: 'Original coastal layers with structured coats, caps, and deck gear.',
    assets: harborAssets,
    defaults: {
      body: 'harbor.body.standard', hair: 'harbor.hair.wave', headwear: 'harbor.headwear.cap',
      torso: 'harbor.torso.coat', legs: 'harbor.legs.deck', feet: 'harbor.feet.deckboots',
    },
  },
]

export function packById(id: string): ContentPack {
  return PACKS.find(pack => pack.id === id) ?? PACKS[0]
}

export function assetsForSlot(pack: ContentPack, slot: SlotId): PackAsset[] {
  return pack.assets.filter(item => item.slot === slot)
}

export function selectedAssets(pack: ContentPack, selections: Record<SlotId, string | null>): PackAsset[] {
  return Object.values(selections)
    .filter((id): id is string => Boolean(id))
    .map(id => pack.assets.find(item => item.id === id))
    .filter((item): item is PackAsset => Boolean(item))
}

export { allDirections }
