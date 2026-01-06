/// <reference types="vite/client" />
/// <reference types="vite-imagetools/client" />

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
