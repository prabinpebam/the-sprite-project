import type { SpriteHostBridge } from './host/bridge'

declare global {
  interface Window {
    spriteHost?: Readonly<SpriteHostBridge>
  }
}

export {}