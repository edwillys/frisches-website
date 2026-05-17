/// <reference types="vite/client" />
/// <reference types="vite-imagetools/client" />

interface ImportMetaEnv {
  readonly VITE_AUDIO_DEBUG_HUD?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Type declarations for vite-imagetools query parameters
declare module '*.png?w=*&format=webp' {
  const src: string
  export default src
}

declare module '*.jpg?w=*&format=webp' {
  const src: string
  export default src
}

declare module '*.png?*' {
  const src: string
  export default src
}

declare module '*.jpg?*' {
  const src: string
  export default src
}
