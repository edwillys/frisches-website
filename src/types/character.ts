export interface Character {
  id: number
  name: string
  modelPath?: string
  rotationY?: number
  scale?: number
  instruments?: string[]
  influences?: string[]
  favoriteTrackId?: string
  // Group-specific properties
  isGroup?: boolean
  yearFormed?: number
  genre?: string
  description?: string
  albumIds?: string[]
  socialLinks?: {
    instagram?: string
    spotify?: string
    youtube?: string
  }
}
