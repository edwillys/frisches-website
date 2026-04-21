export interface Character {
  id: number
  name: string
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
    github?: string
    email?: string
  }
}
